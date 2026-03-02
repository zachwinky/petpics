import { fal } from '@fal-ai/client';
import { createModel, createGeneration, updateModelPreviewImage, deletePendingTraining, updatePendingTrainingStatus, getAdminConfig, PendingTraining, logUserEvent } from '@/lib/db';
import { sendTrainingCompleteEmail, sendTrainingCompleteEmailWithImages, sendTrainingFailedEmail } from '@/lib/email';
import { PetType } from '@/lib/petTypeDetection';
import { getPromptForPetType } from '@/lib/presetPrompts';
import { watermarkAndUpload } from '@/lib/watermark';

// Generate a single image using flux-lora
export async function generateSingleImage(loraUrl: string, triggerWord: string, promptText: string, petType?: string): Promise<string | null> {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) return null;

  try {
    const petLabel = petType === 'cat' ? 'cat' : 'pet';
    const fullPrompt = `Award-winning ${petLabel} portrait of ${triggerWord}, ${promptText}, natural pose, sharp focus, professional DSLR quality`;

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
        image_size: { width: 1024, height: 1024 },
        num_inference_steps: 40,
        guidance_scale: 5.5,
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
export async function generateSampleImages(
  userId: number,
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
    const imagePromises = allPrompts.map(prompt => generateSingleImage(loraUrl, triggerWord, prompt, petType));
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

    // Save unwatermarked images as a generation so they appear in the pet's gallery
    try {
      await createGeneration(
        userId,
        modelId,
        null,
        'Training samples',
        validImageUrls,
        0,
      );
      console.log(`Sample generation saved for model ${modelId} (${validImageUrls.length} images)`);
    } catch (err) {
      console.error('Failed to save sample generation:', err);
    }

    // Watermark all images for email — NEVER fall back to unwatermarked originals
    console.log(`Watermarking ${validImageUrls.length} images...`);
    const watermarkPromises = validImageUrls.map(async (url) => {
      try {
        return await watermarkAndUpload(url);
      } catch (error) {
        console.error(`Failed to watermark image ${url}:`, error);
        return null; // Skip failed images — never send unwatermarked
      }
    });
    const watermarkedUrls = (await Promise.all(watermarkPromises)).filter((url): url is string => url !== null);

    console.log(`Sample images generated and watermarked for model ${modelId}:`, watermarkedUrls);
    return watermarkedUrls;
  } catch (error) {
    console.error('Error generating sample images:', error);
    return [];
  }
}

// Check a single training's status and complete it if done
export async function checkAndCompleteTraining(
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
        await updatePendingTrainingStatus(training.fal_request_id, 'failed', 'No model file returned');
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

      await logUserEvent(userId, 'training_completed', { model_id: model.id, trigger_word: training.trigger_word, via: 'pending_poll' });

      // Generate sample images with watermarks, then send email
      // Wrapped in try/catch so model creation is never lost even if samples fail
      try {
        console.log('Generating sample images for email...');
        const sampleImages = await generateSampleImages(userId, model.id, loraUrl, training.trigger_word, petType);

        if (sampleImages.length > 0) {
          // Send success email with sample images
          await sendTrainingCompleteEmailWithImages(
            userEmail,
            userName,
            training.model_name,
            training.trigger_word,
            sampleImages
          );
          console.log('Training complete email sent with sample images');
        } else {
          // Sample generation failed — still send a plain email so user knows model is ready
          console.warn('No sample images generated, sending plain training complete email');
          await sendTrainingCompleteEmail(userEmail, userName, training.model_name, training.trigger_word);
          console.log('Training complete email sent (without images)');
        }
      } catch (sampleError) {
        console.error('Sample generation/email failed (model still created):', sampleError);
        // Last-resort: try sending plain email
        try {
          await sendTrainingCompleteEmail(userEmail, userName, training.model_name, training.trigger_word);
        } catch {
          console.error('Even plain training complete email failed');
        }
      }

      return { completed: true, failed: false };

    } else if (currentStatus === 'FAILED') {
      await updatePendingTrainingStatus(training.fal_request_id, 'failed', 'Training failed on FAL servers');
      sendTrainingFailedEmail(userEmail, userName, training.model_name, 'Training failed on FAL servers');
      return { completed: false, failed: true };
    }

    // Still in progress
    return { completed: false, failed: false };

  } catch (error) {
    console.error(`Error checking training ${training.id}:`, error);

    // If training has been pending for more than 2 hours and we can't reach FAL,
    // mark it as failed so the user isn't stuck forever
    const trainingAge = Date.now() - new Date(training.created_at).getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    if (trainingAge > TWO_HOURS) {
      console.error(`Training ${training.id} is over 2 hours old and FAL status check failed. Marking as failed.`);
      try {
        await updatePendingTrainingStatus(
          training.fal_request_id,
          'failed',
          `Training timed out after ${Math.round(trainingAge / 60000)} minutes. FAL status check error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        sendTrainingFailedEmail(
          userEmail,
          userName,
          training.model_name,
          'Training timed out. Please try again.'
        );

        return { completed: false, failed: true };
      } catch (timeoutError) {
        console.error(`Error handling timed-out training ${training.id}:`, timeoutError);
      }
    }

    return { completed: false, failed: false };
  }
}
