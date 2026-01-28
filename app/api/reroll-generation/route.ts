import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, getGenerationById, updateGenerationImages } from '@/lib/db';
import { PRESET_PROMPTS } from '@/lib/presetPrompts';
import { getImageDimensions, DEFAULT_ASPECT_RATIO } from '@/lib/platformPresets';

const FAL_KEY = process.env.FAL_KEY;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { generationId, modelId, loraUrl, triggerWord, rowIndex = 0 } = body;

    if (!generationId || !modelId || !loraUrl || !triggerWord) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the generation and verify ownership
    const generation = await getGenerationById(generationId, userId);
    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Check if remake was already used (only one free remake per batch)
    if (generation.reroll_used) {
      return NextResponse.json(
        { error: 'Remake has already been used for this batch' },
        { status: 400 }
      );
    }

    // Determine the prompt for this specific row
    let rowPrompt: string;

    // Calculate total rows in this generation
    const totalRows = Math.ceil(generation.image_urls.length / 4);

    console.log('Remake debug - rowIndex:', rowIndex);
    console.log('Remake debug - totalRows:', totalRows);
    console.log('Remake debug - row_prompts:', generation.row_prompts);
    console.log('Remake debug - custom_prompt:', generation.custom_prompt);
    console.log('Remake debug - preset_prompt_id:', generation.preset_prompt_id);

    // First try to use stored row_prompts if available (new generations)
    if (generation.row_prompts && Array.isArray(generation.row_prompts) && generation.row_prompts.length > rowIndex && generation.row_prompts[rowIndex]) {
      rowPrompt = generation.row_prompts[rowIndex];
      console.log('Remake debug - using row_prompts[rowIndex]:', rowPrompt);
    } else if (generation.custom_prompt) {
      // custom_prompt may contain comma-separated scene IDs (e.g., "cafe-scene, luxury-silk, beach-scene")
      // or it may be an actual custom prompt text
      const sceneIds = generation.custom_prompt.split(', ').map(s => s.trim());
      console.log('Remake debug - parsed sceneIds from custom_prompt:', sceneIds);

      // Check if the first item looks like a preset ID
      const firstItemIsPreset = PRESET_PROMPTS.some(p => p.id === sceneIds[0]);

      if (firstItemIsPreset) {
        // It's preset scene IDs - we need to reconstruct the prompt distribution
        // Use the same distribution logic as batch-generate
        const scenesData = sceneIds
          .map(sceneId => PRESET_PROMPTS.find(p => p.id === sceneId))
          .filter((scene): scene is typeof PRESET_PROMPTS[number] => scene !== null && scene !== undefined);

        if (scenesData.length > 0) {
          // Reconstruct the prompts array using the same distribution logic
          const batchesPerScene = Math.floor(totalRows / scenesData.length);
          const remainder = totalRows % scenesData.length;

          const reconstructedPrompts: string[] = [];
          scenesData.forEach((scene, index) => {
            const batchesForThisScene = batchesPerScene + (index < remainder ? 1 : 0);
            for (let i = 0; i < batchesForThisScene; i++) {
              reconstructedPrompts.push(scene.prompt);
            }
          });

          console.log('Remake debug - reconstructedPrompts:', reconstructedPrompts);
          rowPrompt = reconstructedPrompts[rowIndex] || reconstructedPrompts[0] || 'elegant product shot';
          console.log('Remake debug - using reconstructed prompt for row:', rowPrompt);
        } else {
          rowPrompt = 'elegant product shot';
          console.log('Remake debug - no valid scenes found, using default');
        }
      } else {
        // It's an actual custom prompt text, use as-is for all rows
        rowPrompt = generation.custom_prompt;
        console.log('Remake debug - using custom_prompt as text:', rowPrompt);
      }
    } else if (generation.preset_prompt_id) {
      // Legacy: Try to find from preset_prompt_id (comma-separated)
      const presetIds = generation.preset_prompt_id.split(', ');
      console.log('Remake debug - presetIds from preset_prompt_id:', presetIds);
      const presetId = presetIds[rowIndex] || presetIds[0];
      console.log('Remake debug - selected presetId:', presetId);
      const preset = PRESET_PROMPTS.find(p => p.id === presetId);
      rowPrompt = preset?.prompt || 'elegant product shot';
      console.log('Remake debug - using preset prompt from preset_prompt_id:', rowPrompt);
    } else {
      rowPrompt = 'elegant product shot';
      console.log('Remake debug - using default prompt');
    }

    const fullPrompt = `Professional pet photography of ${triggerWord}, ${rowPrompt}, high quality, detailed, studio lighting`;

    // Use the same aspect ratio as the original generation
    const imageSize = getImageDimensions(generation.aspect_ratio || DEFAULT_ASPECT_RATIO);

    // Generate 4 new images for this row
    const falResponse = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        loras: [
          {
            path: loraUrl,
            scale: 1,
          },
        ],
        num_images: 4,
        image_size: imageSize,
        num_inference_steps: 40,
        guidance_scale: 5.5,
        enable_safety_checker: false,
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('FAL API error:', errorText);
      return NextResponse.json(
        { error: 'Image generation failed' },
        { status: 500 }
      );
    }

    const falData = await falResponse.json();
    const newImageUrls = falData.images?.map((img: { url: string }) => img.url) || [];

    if (newImageUrls.length === 0) {
      return NextResponse.json(
        { error: 'No images generated' },
        { status: 500 }
      );
    }

    // Replace only the specific row's images
    const updatedImageUrls = [...generation.image_urls];
    const startIdx = rowIndex * 4;

    for (let i = 0; i < 4 && i < newImageUrls.length; i++) {
      if (startIdx + i < updatedImageUrls.length) {
        updatedImageUrls[startIdx + i] = newImageUrls[i];
      }
    }

    // Update the generation with new images and mark remake as used
    const updatedGeneration = await updateGenerationImages(
      generationId,
      userId,
      updatedImageUrls,
      true
    );

    if (!updatedGeneration) {
      return NextResponse.json(
        { error: 'Failed to update generation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrls: newImageUrls,  // Return just the new 4 images for this row
      rowIndex,
    });

  } catch (error) {
    console.error('Remake error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
