import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { auth } from '@/lib/auth';
import { getUserPendingTrainings, getUserById, updateUserCredits, createModel, updateModelPreviewImage, deletePendingTraining, updatePendingTrainingStatus, getAdminConfig, PendingTraining } from '@/lib/db';
import { sendTrainingCompleteEmailWithImages, sendTrainingFailedEmail } from '@/lib/email';
import { PetType } from '@/lib/petTypeDetection';
import { getPromptForPetType } from '@/lib/presetPrompts';
import { watermarkAndUpload } from '@/lib/watermark';

const TRAINING_COST_CREDITS = 10;

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

// Check a single training's status and complete it if done
async function checkAndCompleteTraining(
  training: PendingTraining,
  userId: number,
  userEmail: string,
  userName: string
): Promise<{ completed: boolean; failed: boolean }> {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    return { completed: false, failed: false };
  }

  fal.config({ credentials: apiKey });

  try {
    const statusResponse = await fal.queue.status('fal-ai/flux-lora-fast-training', {
      requestId: training.fal_request_id,
      logs: false,
    });

    const currentStatus = statusResponse.status as string;
    console.log(`Pending training ${training.id} status:`, currentStatus);

    if (currentStatus === 'COMPLETED') {
      // Get the result
      const result = await fal.queue.result('fal-ai/flux-lora-fast-training', {
        requestId: training.fal_request_id,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loraUrl = (result.data as any)?.diffusers_lora_file?.url;

      if (!loraUrl) {
        // Update pending training status
        await updatePendingTrainingStatus(training.fal_request_id, 'failed', 'No model file returned');

        // Refund credits
        await updateUserCredits(
          userId,
          TRAINING_COST_CREDITS,
          'purchase',
          `Refund: Training completed but no model file for ${training.trigger_word}`
        );

        // Send failure email
        sendTrainingFailedEmail(userEmail, userName, training.model_name, 'Training completed but no model file was generated');

        return { completed: false, failed: true };
      }

      // Get pet type from pending training record
      const petType: PetType = (training.pet_type as PetType) || 'dog';

      // Delete pending training record since we're creating the actual model
      await deletePendingTraining(training.fal_request_id);

      // Create model record
      let model;
      try {
        model = await createModel(
          userId,
          training.model_name,
          loraUrl,
          training.trigger_word,
          training.images_count,
          petType
        );
      } catch (error) {
        console.error('Error creating model record:', error);
        return { completed: true, failed: false }; // Training done but DB failed
      }

      // Generate sample images with watermarks, then send email
      console.log('Generating sample images for email...');
      const sampleImages = await generateSampleImages(model.id, loraUrl, training.trigger_word, petType);

      // Send success email with sample images
      if (sampleImages.length > 0) {
        await sendTrainingCompleteEmailWithImages(
          userEmail,
          userName,
          training.model_name,
          training.trigger_word,
          sampleImages
        );
        console.log('Training complete email sent with sample images');
      }

      return { completed: true, failed: false };

    } else if (currentStatus === 'FAILED') {
      // Update pending training status
      await updatePendingTrainingStatus(training.fal_request_id, 'failed', 'Training failed on FAL servers');

      // Refund credits
      await updateUserCredits(
        userId,
        TRAINING_COST_CREDITS,
        'purchase',
        `Refund: Training failed for ${training.trigger_word}`
      );

      // Send failure email
      sendTrainingFailedEmail(userEmail, userName, training.model_name, 'Training failed on FAL servers');

      return { completed: false, failed: true };
    }

    // Still in progress
    return { completed: false, failed: false };

  } catch (error) {
    console.error(`Error checking training ${training.id}:`, error);
    return { completed: false, failed: false };
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const user = await getUserById(userId);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get pending trainings
  let pendingTrainings = await getUserPendingTrainings(userId);

  // Check status of each pending training and complete if done
  // This triggers the sample image generation and email sending
  for (const training of pendingTrainings) {
    const { completed, failed } = await checkAndCompleteTraining(
      training,
      userId,
      user.email,
      user.name || ''
    );

    if (completed || failed) {
      // Refresh the list after completion
      pendingTrainings = await getUserPendingTrainings(userId);
    }
  }

  return NextResponse.json({ pendingTrainings });
}
