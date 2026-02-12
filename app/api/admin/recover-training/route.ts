import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getUserById, getUserModels, createModel, updateModelPreviewImage, deletePendingTraining, getAdminConfig, pool } from '@/lib/db';
import { sendTrainingCompleteEmailWithImages } from '@/lib/email';
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
        image_size: { width: 1024, height: 1024 },
        num_inference_steps: 40,
        guidance_scale: 5.5,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image generation failed:', errorText);
      return null;
    }

    const data = await response.json();
    return data.images?.[0]?.url || null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

/**
 * Admin endpoint to recover a stuck training by fetching the result from FAL.
 *
 * Use case: FAL retried a training with a new request ID that our system doesn't know about.
 * This endpoint takes the successful FAL request ID, fetches the LoRA, creates the model,
 * and sends the training complete email.
 *
 * Body: {
 *   falRequestId: string  - The FAL request ID for the successful training
 *   userId: number        - The user who owns this training
 *   triggerWord: string   - The trigger word used in training
 *   modelName?: string    - Optional model name (defaults to "Photo Subject {triggerWord}")
 *   petType?: string      - Optional pet type: "dog" | "cat" (defaults to "dog")
 *   skipEmail?: boolean   - Skip sending the email (just create the model)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { falRequestId, userId, triggerWord, modelName, petType: petTypeInput, skipEmail } = body;

    if (!falRequestId || !userId || !triggerWord) {
      return NextResponse.json(
        { error: 'Required: falRequestId, userId, triggerWord' },
        { status: 400 }
      );
    }

    const user = await getUserById(parseInt(userId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 });
    }

    fal.config({ credentials: apiKey });

    // Step 1: Check training status on FAL
    console.log(`Recovering training: FAL request ${falRequestId} for user ${userId}`);

    let statusResponse;
    try {
      statusResponse = await fal.queue.status('fal-ai/flux-lora-fast-training', {
        requestId: falRequestId,
        logs: false,
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to check FAL training status',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'The request ID may be invalid or expired',
      }, { status: 400 });
    }

    const falStatus = statusResponse.status as string;
    console.log(`FAL training status: ${falStatus}`);

    if (falStatus !== 'COMPLETED') {
      return NextResponse.json({
        error: `Training is not complete. Current FAL status: ${falStatus}`,
        falStatus,
      }, { status: 400 });
    }

    // Step 2: Fetch the training result to get LoRA URL
    let result;
    try {
      result = await fal.queue.result('fal-ai/flux-lora-fast-training', {
        requestId: falRequestId,
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to fetch training result from FAL',
        details: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loraUrl = (result.data as any)?.diffusers_lora_file?.url;

    if (!loraUrl) {
      return NextResponse.json({
        error: 'Training completed but no LoRA file in result',
        resultData: result.data,
      }, { status: 500 });
    }

    console.log(`LoRA URL retrieved: ${loraUrl}`);

    // Step 3: Check if a model already exists for this user/trigger (from a previous recovery attempt)
    const name = modelName || `Photo Subject ${triggerWord}`;
    const petType: PetType = (petTypeInput as PetType) || 'dog';
    const existingModels = await getUserModels(parseInt(userId));
    const existingModel = existingModels.find(m => m.trigger_word.toLowerCase() === triggerWord.toLowerCase());

    let model;
    if (existingModel) {
      // Update the existing model's LoRA URL (it may have been created with an expired URL)
      console.log(`Found existing model ${existingModel.id} for ${triggerWord}, updating LoRA URL`);
      await pool.query(
        `UPDATE models SET lora_url = $1 WHERE id = $2`,
        [loraUrl, existingModel.id]
      );
      model = { ...existingModel, lora_url: loraUrl };
    } else {
      model = await createModel(
        parseInt(userId),
        name,
        loraUrl,
        triggerWord,
        5, // default images count
        petType
      );
      console.log(`Model created: ID ${model.id}`);
    }

    // Step 4: Clean up any stale pending training records for this user/trigger
    try {
      const pendingResult = await pool.query(
        `DELETE FROM pending_trainings WHERE user_id = $1 AND trigger_word = $2 RETURNING id`,
        [parseInt(userId), triggerWord]
      );
      if (pendingResult.rows.length > 0) {
        console.log(`Cleaned up ${pendingResult.rows.length} stale pending training record(s)`);
      }
    } catch (error) {
      console.error('Error cleaning up pending trainings (non-fatal):', error);
    }

    // Step 5: Try to generate sample images and send email
    let sampleImages: string[] = [];
    let emailSent = false;

    if (!skipEmail) {
      try {
        console.log('Generating sample images...');
        const samplePromptIds = await getAdminConfig<string[]>('sample_prompt_ids') || ['studio-white', 'park-scene'];
        const previewPrompt = 'elegant studio portrait, crisp white backdrop, professional lighting, magazine cover quality';
        const samplePrompts = samplePromptIds.map(id => getPromptForPetType(id, petType));
        const allPrompts = [previewPrompt, ...samplePrompts];

        // Generate images sequentially to be safe
        for (const prompt of allPrompts) {
          const imageUrl = await generateSingleImage(loraUrl, triggerWord, prompt);
          if (imageUrl) {
            sampleImages.push(imageUrl);
          }
        }

        if (sampleImages.length > 0) {
          // Save preview image
          await updateModelPreviewImage(model.id, sampleImages[0]);

          // Watermark for email
          const watermarkedUrls: string[] = [];
          for (const url of sampleImages) {
            try {
              const watermarked = await watermarkAndUpload(url);
              watermarkedUrls.push(watermarked);
            } catch (error) {
              console.error('Watermark failed (non-fatal):', error);
            }
          }

          if (watermarkedUrls.length > 0) {
            await sendTrainingCompleteEmailWithImages(
              user.email,
              user.name || '',
              name,
              triggerWord,
              watermarkedUrls
            );
            emailSent = true;
            console.log(`Training complete email sent to ${user.email}`);
          }
        }
      } catch (error) {
        console.error('Sample generation/email failed (non-fatal):', error);
      }
    }

    return NextResponse.json({
      success: true,
      existingModelUpdated: !!existingModel,
      model: {
        id: model.id,
        name: model.name,
        triggerWord: model.trigger_word,
        loraUrl: model.lora_url,
      },
      emailSent,
      sampleImagesGenerated: sampleImages.length,
      message: emailSent
        ? `${existingModel ? 'Model updated' : 'Model created'} and email sent to ${user.email}`
        : `${existingModel ? 'Model updated' : 'Model created'} for user ${userId}. ${skipEmail ? 'Email skipped.' : 'Sample generation/email may have failed - user can still generate images.'}`,
    });

  } catch (error) {
    console.error('Error recovering training:', error);
    return NextResponse.json(
      { error: 'Failed to recover training', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
