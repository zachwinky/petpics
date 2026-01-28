import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { auth } from '@/lib/auth';
import { getUserById, updateUserCredits, createModel, updateModelPreviewImage, deletePendingTraining, updatePendingTrainingStatus, getPendingTrainingByRequestId } from '@/lib/db';
import { sendTrainingCompleteEmail, sendTrainingFailedEmail } from '@/lib/email';

// Generate a preview image for a newly trained model (runs in background)
async function generatePreviewImage(modelId: number, loraUrl: string, triggerWord: string) {
  try {
    console.log(`Generating preview image for model ${modelId}...`);

    const FAL_KEY = process.env.FAL_KEY;
    if (!FAL_KEY) {
      console.error('FAL_KEY not configured for preview generation');
      return;
    }

    const response = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Professional pet photography of ${triggerWord}, clean white studio background, professional lighting, high quality, detailed, commercial photography`,
        loras: [
          {
            path: loraUrl,
            scale: 1,
          },
        ],
        num_images: 1,
        image_size: {
          width: 512,
          height: 512,
        },
        num_inference_steps: 20,
        guidance_scale: 3.5,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Preview generation failed:', errorText);
      return;
    }

    const data = await response.json();
    const previewUrl = data.images?.[0]?.url;

    if (previewUrl) {
      await updateModelPreviewImage(modelId, previewUrl);
      console.log(`Preview image saved for model ${modelId}`);
    }
  } catch (error) {
    console.error('Error generating preview image:', error);
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

    // Check status
    const statusResponse = await fal.queue.status('fal-ai/flux-lora-fast-training', {
      requestId,
      logs: true,
    });

    const currentStatus = statusResponse.status as string;
    console.log('Training status check:', currentStatus, 'for request:', requestId);

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
        const modelName = `Photo Subject ${triggerWord}`;
        sendTrainingFailedEmail(user.email, user.name || '', modelName, 'Training completed but no model file was generated');

        return NextResponse.json({
          status: 'failed',
          error: 'Training completed but no LoRA file returned. Credits have been refunded.',
        });
      }

      // Delete pending training record since we're creating the actual model
      await deletePendingTraining(requestId);

      // Create model record
      const modelName = `Photo Subject ${triggerWord}`;
      let model;
      try {
        model = await createModel(
          userId,
          modelName,
          loraUrl,
          triggerWord,
          imagesCount || 5
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

      // Generate preview image in background (don't await)
      generatePreviewImage(model.id, loraUrl, triggerWord);

      // Send success email notification
      sendTrainingCompleteEmail(user.email, user.name || '', modelName, triggerWord);

      return NextResponse.json({
        status: 'completed',
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
      const modelName = `Photo Subject ${triggerWord}`;
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
