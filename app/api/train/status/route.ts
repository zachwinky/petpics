import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { auth } from '@/lib/auth';
import { getUserById, updateUserCredits, createModel, updateModelPreviewImage, deletePendingTraining, updatePendingTrainingStatus, getPendingTrainingByRequestId, getAdminConfig } from '@/lib/db';
import { sendTrainingCompleteEmailWithImages, sendTrainingFailedEmail } from '@/lib/email';
import { PetType } from '@/lib/petTypeDetection';
import { getPromptForPetType } from '@/lib/presetPrompts';
import { watermarkAndUpload } from '@/lib/watermark';

// Generate a single image using flux-lora
async function generateSingleImage(loraUrl: string, triggerWord: string, promptText: string): Promise<string | null> {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return null;

  try {
    const fullPrompt = `Award-winning pet portrait of ${triggerWord}, ${promptText}, looking at camera with expressive eyes, sharp focus, professional DSLR quality`;

    const response = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        loras: [{ path: loraUrl, scale: 1 }],
        num_images: 1,
        image_size: { width: 512, height: 512 },
        num_inference_steps: 20,
        guidance_scale: 3.5,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      console.error('Image generation failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.images?.[0]?.url || null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

// Generate 3 sample images (preview + 2 admin-selected prompts) with watermarks
async function generateSampleImages(
  modelId: number,
  loraUrl: string,
  triggerWord: string,
  petType: PetType
): Promise<string[]> {
  try {
    console.log(`Generating sample images for model ${modelId}...`);

    // Get admin-configured sample prompt IDs
    const samplePromptIds = await getAdminConfig<string[]>('sample_prompt_ids') || ['studio-white', 'park-scene'];

    // Build prompts: preview + 2 admin-selected
    const previewPrompt = 'elegant studio portrait, crisp white backdrop, professional lighting, magazine cover quality';
    const samplePrompts = samplePromptIds.map(id => getPromptForPetType(id, petType));

    const allPrompts = [previewPrompt, ...samplePrompts];

    // Generate all 3 images in parallel
    const imagePromises = allPrompts.map(prompt => generateSingleImage(loraUrl, triggerWord, prompt));
    const imageUrls = await Promise.all(imagePromises);

    const validImageUrls = imageUrls.filter((url): url is string => url !== null);

    if (validImageUrls.length === 0) {
      console.error('No sample images generated successfully');
      return [];
    }

    // Save first image (preview) to model record
    if (validImageUrls[0]) {
      await updateModelPreviewImage(modelId, validImageUrls[0]);
      console.log(`Preview image saved for model ${modelId}`);
    }

    // Watermark all images for email (with individual error handling)
    console.log(`Watermarking ${validImageUrls.length} images...`);
    const watermarkPromises = validImageUrls.map(async (url) => {
      try {
        return await watermarkAndUpload(url);
      } catch (error) {
        console.error(`Failed to watermark image ${url}:`, error);
        // Return original URL as fallback if watermarking fails
        return url;
      }
    });
    const watermarkedUrls = await Promise.all(watermarkPromises);

    console.log(`Sample images generated and watermarked for model ${modelId}:`, watermarkedUrls);
    return watermarkedUrls;
  } catch (error) {
    console.error('Error generating sample images:', error);
    return [];
  }
}

const TRAINING_COST_CREDITS = 10;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
    const { requestId, triggerWord, imagesCount } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'FAL API key not configured' },
        { status: 500 }
      );
    }

    fal.config({ credentials: apiKey });

    // Get pending training record to retrieve model_name and pet_type
    const pendingTraining = await getPendingTrainingByRequestId(requestId);
    const modelName = pendingTraining?.model_name || `Photo Subject ${triggerWord}`;
    const petType: PetType = (pendingTraining?.pet_type as PetType) || 'dog';

    // Check status
    const statusResponse = await fal.queue.status('fal-ai/flux-lora-fast-training', {
      requestId,
      logs: true,
    });

    const currentStatus = statusResponse.status as string;
    console.log('Training status check:', currentStatus, 'for request:', requestId, 'petType:', petType);

    if (currentStatus === 'COMPLETED') {
      // Get the result
      const result = await fal.queue.result('fal-ai/flux-lora-fast-training', {
        requestId,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loraUrl = (result.data as any)?.diffusers_lora_file?.url;

      if (!loraUrl) {
        // Update pending training status
        await updatePendingTrainingStatus(requestId, 'failed', 'No model file returned');

        // Refund credits
        await updateUserCredits(
          userId,
          TRAINING_COST_CREDITS,
          'purchase',
          `Refund: Training completed but no model file for ${triggerWord}`
        );

        // Send failure email
        sendTrainingFailedEmail(user.email, user.name || '', modelName, 'Training completed but no model file was generated');

        return NextResponse.json({
          status: 'failed',
          error: 'Training completed but no LoRA file returned. Credits have been refunded.',
        });
      }

      // Delete pending training record since we're creating the actual model
      await deletePendingTraining(requestId);

      // Create model record (using modelName and petType from earlier lookup)
      let model;
      try {
        model = await createModel(
          userId,
          modelName,
          loraUrl,
          triggerWord,
          imagesCount || 5,
          petType
        );
      } catch (error) {
        console.error('Error creating model record:', error);
        // Still return success, just note the DB issue
        return NextResponse.json({
          status: 'completed',
          loraUrl,
          triggerWord,
          warning: 'Model trained but failed to save to account. Please contact support.',
        });
      }

      // Generate sample images with watermarks, then send email
      console.log('Generating sample images for email...');
      const sampleImages = await generateSampleImages(model.id, loraUrl, triggerWord, petType);

      // Send success email with sample images
      if (sampleImages.length > 0) {
        await sendTrainingCompleteEmailWithImages(
          user.email,
          user.name || '',
          modelName,
          triggerWord,
          sampleImages
        );
        console.log('Training complete email sent with sample images');
      }

      return NextResponse.json({
        status: 'completed',
        modelId: model.id,
        loraUrl,
        triggerWord,
        message: 'Model trained successfully!',
      });
    } else if (currentStatus === 'FAILED') {
      // Update pending training status
      await updatePendingTrainingStatus(requestId, 'failed', 'Training failed on FAL servers');

      // Refund credits
      await updateUserCredits(
        userId,
        TRAINING_COST_CREDITS,
        'purchase',
        `Refund: Training failed for ${triggerWord}`
      );

      // Send failure email
      sendTrainingFailedEmail(user.email, user.name || '', modelName, 'Training failed on FAL servers');

      return NextResponse.json({
        status: 'failed',
        error: 'Training failed. Credits have been refunded.',
      });
    } else if (currentStatus === 'IN_QUEUE' || currentStatus === 'IN_PROGRESS') {
      return NextResponse.json({
        status: 'pending',
        message: 'Training is still in progress...',
        queueStatus: currentStatus,
      });
    }

    return NextResponse.json({
      status: 'unknown',
      rawStatus: currentStatus,
    });

  } catch (error) {
    console.error('Error checking training status:', error);
    return NextResponse.json(
      { error: 'Failed to check training status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
