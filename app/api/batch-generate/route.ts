import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, createGeneration, getModelById } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { PRESET_PROMPTS, getPromptForPetType, PetType } from '@/lib/presetPrompts';
import { scoreImagesWithPrompts } from '@/lib/imageQuality';
import { getImageDimensions, DEFAULT_ASPECT_RATIO } from '@/lib/platformPresets';

const FAL_KEY = process.env.FAL_KEY;
const MAX_PROMPT_LENGTH = 500;

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

export async function POST(request: NextRequest) {
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

    // Rate limiting: 10 batch generations per minute per IP
    const rateLimitResult = await rateLimit(request, 10, 60000);
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', retryAfter: rateLimitResult.retryAfter },
        { status: 429, headers: { 'Retry-After': rateLimitResult.retryAfter.toString() } }
      );
    }

    const body = await request.json();
    const { modelId, triggerWord, batchSize, selectedScenes, customPrompt, enableUpscale, aspectRatio } = body;

    // Get image dimensions based on selected aspect ratio
    const imageSize = getImageDimensions(aspectRatio || DEFAULT_ASPECT_RATIO);

    if (!modelId || !triggerWord || !batchSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate custom prompt length
    if (customPrompt && customPrompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Custom prompt must be ${MAX_PROMPT_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Fetch model to get loraUrl, product description, and pet type — always use DB value, never trust client
    const model = await getModelById(modelId, userId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    const loraUrl = model.lora_url;
    const productDescription = model.product_description;
    const petType: PetType = (model.pet_type as PetType) || 'dog';

    // Build prompts array
    let prompts: string[] = [];

    if (customPrompt) {
      // Custom prompt mode: use same prompt for all batches
      const batchCount = batchSize / 4;
      prompts = Array(batchCount).fill(customPrompt);
    } else if (selectedScenes && selectedScenes.length > 0) {
      // Multi-scene mode: distribute images across scenes with pet-type-specific prompts
      const validSceneIds = selectedScenes.filter((sceneId: string) =>
        PRESET_PROMPTS.find(p => p.id === sceneId)
      );

      if (validSceneIds.length === 0) {
        return NextResponse.json(
          { error: 'Invalid scenes selected' },
          { status: 400 }
        );
      }

      // Calculate how many batches (of 4) per scene
      const totalBatches = batchSize / 4;
      const batchesPerScene = Math.floor(totalBatches / validSceneIds.length);
      const remainder = totalBatches % validSceneIds.length;

      // Distribute batches across scenes, using pet-type-specific prompts
      prompts = [];
      validSceneIds.forEach((sceneId: string, index: number) => {
        const batchesForThisScene = batchesPerScene + (index < remainder ? 1 : 0);
        // Get pet-type-specific prompt (uses catPrompt if cat, otherwise default)
        const promptText = getPromptForPetType(sceneId, petType);
        for (let i = 0; i < batchesForThisScene; i++) {
          prompts.push(promptText);
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
      // Generate all batches in parallel
      const generatePromises = prompts.map(async (prompt) => {
        // Build prompt with enhanced photography keywords for engagement
        const petLabel = petType === 'cat' ? 'cat' : 'pet';
        let fullPrompt = `Award-winning ${petLabel} portrait of ${triggerWord}, ${prompt}, natural pose, sharp focus, shallow depth of field, professional DSLR quality, 8k detail`;
        if (productDescription && productDescription !== 'NO_TEXT_VISIBLE') {
          fullPrompt = `Award-winning ${petLabel} portrait of ${triggerWord} with text ${productDescription}, ${prompt}, natural pose, sharp focus, shallow depth of field, professional DSLR quality, 8k detail`;
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
        0,
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
