import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, createGeneration, updateUserCredits, getModelById } from '@/lib/db';
import { PRESET_PROMPTS } from '@/lib/presetPrompts';
import { scoreImagesWithPrompts } from '@/lib/imageQuality';
import { getImageDimensions, DEFAULT_ASPECT_RATIO } from '@/lib/platformPresets';

const FAL_KEY = process.env.FAL_KEY;

// Upscale a single image using FAL Clarity Upscaler
async function upscaleImage(imageUrl: string, upscaleFactor: number = 2): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      upscale_factor: upscaleFactor,
      prompt: 'professional pet photography, high quality, sharp details, studio lighting',
      negative_prompt: '(worst quality, low quality, blurry, noise, artifacts:2)',
      creativity: 0.2, // Lower creativity to preserve original image
      resemblance: 0.8, // Higher resemblance to keep product accurate
      num_inference_steps: 20,
      enable_safety_checker: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Upscale error:', errorText);
    throw new Error(`Upscale failed: ${errorText}`);
  }

  const data = await response.json();
  return data.image?.url || imageUrl; // Return original if upscale fails
}

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
    const { modelId, loraUrl, triggerWord, batchSize, selectedScenes, customPrompt, enableUpscale, aspectRatio } = body;

    // Get image dimensions based on selected aspect ratio
    const imageSize = getImageDimensions(aspectRatio || DEFAULT_ASPECT_RATIO);

    if (!modelId || !loraUrl || !triggerWord || !batchSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch model to get product description (for text accuracy)
    const model = await getModelById(modelId, userId);
    const productDescription = model?.product_description;

    // Calculate cost in credits
    // Base cost + upscale cost (1 extra credit per 4 images if upscaling)
    const baseCost = batchSize === 4 ? 1 : batchSize === 12 ? 3 : 4;
    const upscaleCost = enableUpscale ? Math.ceil(batchSize / 4) : 0;
    const creditsRequired = baseCost + upscaleCost;

    // Check credits
    if (user.credits_balance < creditsRequired) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: creditsRequired,
          current: user.credits_balance
        },
        { status: 402 }
      );
    }

    // Build prompts array
    let prompts: string[] = [];

    if (customPrompt) {
      // Custom prompt mode: use same prompt for all batches
      const batchCount = batchSize / 4;
      prompts = Array(batchCount).fill(customPrompt);
    } else if (selectedScenes && selectedScenes.length > 0) {
      // Multi-scene mode: distribute images across scenes
      const scenesData = selectedScenes
        .map((sceneId: string) => PRESET_PROMPTS.find(p => p.id === sceneId))
        .filter((scene: any): scene is { id: string; name: string; prompt: string } => scene !== null && scene !== undefined);

      if (scenesData.length === 0) {
        return NextResponse.json(
          { error: 'Invalid scenes selected' },
          { status: 400 }
        );
      }

      // Calculate how many batches (of 4) per scene
      const totalBatches = batchSize / 4;
      const batchesPerScene = Math.floor(totalBatches / scenesData.length);
      const remainder = totalBatches % scenesData.length;

      // Distribute batches across scenes
      prompts = [];
      scenesData.forEach((scene: { id: string; name: string; prompt: string }, index: number) => {
        const batchesForThisScene = batchesPerScene + (index < remainder ? 1 : 0);
        for (let i = 0; i < batchesForThisScene; i++) {
          prompts.push(scene.prompt);
        }
      });
    } else {
      return NextResponse.json(
        { error: 'No prompts provided' },
        { status: 400 }
      );
    }

    // Generate images in parallel
    try {
      // Deduct credits first
      await updateUserCredits(
        userId,
        -creditsRequired,
        'generation',
        `Batch generation: ${batchSize} images`
      );

      // Generate all batches in parallel
      const generatePromises = prompts.map(async (prompt) => {
        // Build prompt with enhanced photography keywords for engagement
        let fullPrompt = `Award-winning pet portrait of ${triggerWord}, ${prompt}, looking at camera with expressive eyes, sharp focus, shallow depth of field, professional DSLR quality, 8k detail`;
        if (productDescription && productDescription !== 'NO_TEXT_VISIBLE') {
          fullPrompt = `Award-winning pet portrait of ${triggerWord} with text ${productDescription}, ${prompt}, looking at camera with expressive eyes, sharp focus, shallow depth of field, professional DSLR quality, 8k detail`;
        }

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
          throw new Error(`FAL API error: ${errorText}`);
        }

        const falData = await falResponse.json();
        console.log('FAL API Response:', JSON.stringify(falData, null, 2));
        console.log('Image URLs:', falData.images?.map((img: any) => img.url));
        return falData.images?.map((img: any) => img.url) || [];
      });

      const batchResults = await Promise.all(generatePromises);
      let finalImageUrls = batchResults.flat();

      console.log('Total images generated:', finalImageUrls.length);

      // Upscale images if enabled
      if (enableUpscale && finalImageUrls.length > 0) {
        console.log('Starting upscale for', finalImageUrls.length, 'images');

        // Upscale in batches to avoid overwhelming the API
        const upscalePromises = finalImageUrls.map(async (url, index) => {
          try {
            console.log(`Upscaling image ${index + 1}/${finalImageUrls.length}`);
            const upscaledUrl = await upscaleImage(url, 2); // 2x upscale
            return upscaledUrl;
          } catch (error) {
            console.error(`Failed to upscale image ${index + 1}:`, error);
            return url; // Return original if upscale fails
          }
        });

        finalImageUrls = await Promise.all(upscalePromises);
        console.log('Upscaling complete');
      }

      console.log('All image URLs before returning:', finalImageUrls);

      // Score image quality using CLIP (runs in parallel, adds ~2-5 seconds)
      console.log('Scoring image quality...');
      let qualityScores: number[] | undefined;
      try {
        qualityScores = await scoreImagesWithPrompts(finalImageUrls, prompts, triggerWord);
        console.log('Quality scores:', qualityScores);
      } catch (error) {
        console.error('Error scoring image quality:', error);
        // Continue without scores if scoring fails
      }

      // Record generation in database with row prompts, quality scores, and aspect ratio
      await createGeneration(
        userId,
        modelId,
        null,
        customPrompt || selectedScenes.join(', '),
        finalImageUrls,
        creditsRequired,
        prompts,  // Store the prompt used for each row
        qualityScores,  // Store quality scores for each image
        aspectRatio || DEFAULT_ASPECT_RATIO  // Store aspect ratio for reroll support
      );

      return NextResponse.json({
        success: true,
        imageUrls: finalImageUrls,
        qualityScores,  // Include scores for frontend to use
      });

    } catch (error) {
      console.error('Error during batch generation:', error);

      // Refund credits if generation failed
      await updateUserCredits(
        userId,
        creditsRequired,
        'generation',
        `Refund: Batch generation failed`
      );

      return NextResponse.json(
        {
          error: 'Generation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Batch generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
