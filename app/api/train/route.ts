import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import JSZip from 'jszip';
import { rateLimit } from '@/lib/rateLimit';
import { auth } from '@/lib/auth';
import { getUserById, updateUserCredits, createModel, updateModelPreviewImage, updateModelProductDescription, createPendingTraining, updatePendingTrainingRequestId, deletePendingTraining, updatePendingTrainingStatus } from '@/lib/db';
import { sendTrainingCompleteEmail, sendTrainingFailedEmail } from '@/lib/email';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_IMAGES = 20;
const MIN_IMAGES = 5;

// Analyze product image using LLaVA to extract description including text on labels
async function analyzeProductImage(modelId: number, imageUrl: string) {
  try {
    console.log(`Analyzing product image for model ${modelId}...`);

    const FAL_KEY = process.env.FAL_KEY;
    if (!FAL_KEY) {
      console.error('FAL_KEY not configured for product analysis');
      return;
    }

    const response = await fetch('https://fal.run/fal-ai/llava-next', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: `Look at this product image. List ONLY the text you can clearly read, with its location.

Rules:
- Only include text you are 100% certain about
- If text is blurry or unclear, skip it
- Do not describe the product itself (shape, color, material)
- Do not make up or guess any text
- Include where each text appears (e.g., "on front", "on cap", "near bottom")

Format: "TEXT" on [location]

Example output: "BRAND NAME" on front, "50ml" near bottom, "Made in USA" on back

If you cannot clearly read any text, respond with: NO_TEXT_VISIBLE`,
        max_tokens: 256,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLaVA API error:', errorText);
      return;
    }

    const data = await response.json();
    const productDescription = data.output || '';

    if (productDescription) {
      await updateModelProductDescription(modelId, productDescription);
      console.log(`Product description saved for model ${modelId}`);
    }
  } catch (error) {
    console.error('Error analyzing product image:', error);
    // Don't throw - analysis is non-critical
  }
}

// Generate a preview image for a newly trained model (runs in background, doesn't block response)
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
    // Don't throw - preview generation is non-critical
  }
}
const TRAINING_COST_CREDITS = 10; // Cost to train a model

// Max duration for Vercel serverless (Pro plan allows up to 300s)
// Training itself takes longer but we use polling to check status
export const maxDuration = 300;

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

    // Check if user has enough credits
    if (user.credits_balance < TRAINING_COST_CREDITS) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: TRAINING_COST_CREDITS,
          current: user.credits_balance
        },
        { status: 402 }
      );
    }

    // Rate limiting: 2 training requests per hour per IP (training is expensive)
    const rateLimitResult = await rateLimit(request, 2, 60 * 60 * 1000);
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        {
          error: 'Training rate limit exceeded. You can train 2 models per hour.',
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }
        }
      );
    }

    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const triggerWord = formData.get('triggerWord') as string || 'TOK';

    if (!images || images.length < MIN_IMAGES) {
      return NextResponse.json(
        { error: `At least ${MIN_IMAGES} images required for training` },
        { status: 400 }
      );
    }

    // Validate image count
    if (images.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images allowed for training` },
        { status: 400 }
      );
    }

    // Validate file sizes
    for (const image of images) {
      if (image.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${image.name} exceeds maximum size of 10MB` },
          { status: 400 }
        );
      }
    }

    // Validate trigger word
    if (!triggerWord || triggerWord.length < 2 || triggerWord.length > 20) {
      return NextResponse.json(
        { error: 'Trigger word must be 2-20 characters' },
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

    // Configure fal client
    fal.config({ credentials: apiKey });

    // Step 1: Create a zip file with all training images
    const zip = new JSZip();

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const imageBuffer = await image.arrayBuffer();
      const extension = image.name.split('.').pop() || 'jpg';
      zip.file(`image_${i + 1}.${extension}`, imageBuffer);
    }

    // Generate the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Step 2: Upload the zip to fal storage
    const zipUrl = await fal.storage.upload(zipBlob);

    console.log('Zip uploaded to:', zipUrl);

    // Upload first training image separately for product analysis (LLaVA needs direct image URL)
    const firstImage = images[0];
    const firstImageBlob = new Blob([await firstImage.arrayBuffer()], { type: firstImage.type || 'image/jpeg' });
    const firstImageUrl = await fal.storage.upload(firstImageBlob);
    console.log('First image uploaded for analysis:', firstImageUrl);

    // Deduct credits BEFORE starting training (prevents double-spend if user retries)
    const modelName = formData.get('modelName') as string || `Photo Subject ${triggerWord}`;

    try {
      await updateUserCredits(
        userId,
        -TRAINING_COST_CREDITS,
        'training',
        `Training model: ${triggerWord} with ${images.length} images`
      );
    } catch (error) {
      console.error('Error deducting credits:', error);
      return NextResponse.json(
        { error: 'Failed to deduct credits. Please try again.' },
        { status: 500 }
      );
    }

    // Step 3: Create pending training record (will update with request_id after submission)
    const pendingTraining = await createPendingTraining(
      userId,
      'pending', // Placeholder, will update after FAL submission
      triggerWord,
      modelName,
      images.length
    );

    // Step 4: Submit training to FAL queue (non-blocking)
    console.log('Submitting training job to FAL queue...');
    const { request_id } = await fal.queue.submit('fal-ai/flux-lora-fast-training', {
      input: {
        images_data_url: zipUrl,
        trigger_word: triggerWord,
        steps: 1000,
        is_style: false, // This is for product training, not style
        create_masks: true,
      },
    });

    console.log('Training job submitted with request_id:', request_id);

    // Update pending training with actual FAL request ID
    await updatePendingTrainingRequestId(pendingTraining.id, request_id);

    // Poll for completion (with timeout handling)
    // FAL training typically takes 5-15 minutes
    const maxPollingTime = 280000; // 280 seconds (leave buffer for response)
    const pollInterval = 5000; // Check every 5 seconds
    const startTime = Date.now();

    let result = null;
    let lastStatus = '';

    while (Date.now() - startTime < maxPollingTime) {
      const statusResponse = await fal.queue.status('fal-ai/flux-lora-fast-training', {
        requestId: request_id,
        logs: true,
      });

      const currentStatus = statusResponse.status as string;
      console.log('Training status:', currentStatus);
      lastStatus = currentStatus;

      if (currentStatus === 'COMPLETED') {
        // Get the result
        result = await fal.queue.result('fal-ai/flux-lora-fast-training', {
          requestId: request_id,
        });
        break;
      } else if (currentStatus === 'FAILED') {
        // Update pending training status to failed
        await updatePendingTrainingStatus(request_id, 'failed', 'Training failed on FAL servers');

        // Refund credits on failure
        await updateUserCredits(
          userId,
          TRAINING_COST_CREDITS,
          'purchase', // Use 'purchase' type for refunds
          `Refund: Training failed for ${triggerWord}`
        );

        // Send failure email notification
        sendTrainingFailedEmail(user.email, user.name || '', modelName, 'Training failed on FAL servers');

        return NextResponse.json(
          { error: 'Training failed on FAL servers. Credits have been refunded.' },
          { status: 500 }
        );
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // If we timed out waiting, inform the user but training continues on FAL
    if (!result) {
      console.log('Polling timed out, training still in progress. Last status:', lastStatus);
      // Don't refund - training is still in progress
      // Return the request_id so client can check status later
      return NextResponse.json({
        success: false,
        pending: true,
        requestId: request_id,
        triggerWord,
        message: 'Training is taking longer than expected. It will continue in the background. Please check your dashboard in a few minutes.',
      });
    }

    // Extract the trained LoRA URL
    const loraUrl = result.data?.diffusers_lora_file?.url;

    if (!loraUrl) {
      // Update pending training status to failed
      await updatePendingTrainingStatus(request_id, 'failed', 'No model file returned');

      // Refund credits if no LoRA file returned
      await updateUserCredits(
        userId,
        TRAINING_COST_CREDITS,
        'purchase',
        `Refund: Training completed but no model file for ${triggerWord}`
      );

      // Send failure email notification
      sendTrainingFailedEmail(user.email, user.name || '', modelName, 'Training completed but no model file was generated');

      return NextResponse.json(
        { error: 'Training completed but no LoRA file returned. Credits have been refunded.' },
        { status: 500 }
      );
    }

    // Delete pending training record since we're about to create the actual model
    await deletePendingTraining(request_id);

    // Create model record in database
    let model;
    try {
      model = await createModel(
        userId,
        modelName,
        loraUrl,
        triggerWord,
        images.length
      );
    } catch (error) {
      console.error('Error creating model record:', error);
      // Training succeeded but DB write failed - still return success with loraUrl
      // User can use the model, we just need to manually fix the DB record
      return NextResponse.json({
        success: true,
        loraUrl,
        triggerWord,
        message: 'Model trained successfully! (Note: There was an issue saving to your account, please contact support)',
        creditsUsed: TRAINING_COST_CREDITS,
        warning: 'Database record creation failed',
      });
    }

    // Generate preview image in background (don't await - let it run async)
    generatePreviewImage(model.id, loraUrl, triggerWord);

    // Analyze product image to extract description (helps with text rendering in generations)
    analyzeProductImage(model.id, firstImageUrl);

    // Send success email notification (don't await - non-critical)
    sendTrainingCompleteEmail(user.email, user.name || '', modelName, triggerWord);

    return NextResponse.json({
      success: true,
      loraUrl,
      triggerWord,
      message: 'Model trained successfully!',
      creditsUsed: TRAINING_COST_CREDITS,
    });

  } catch (error) {
    console.error('Error training model:', error);
    return NextResponse.json(
      { error: 'Training failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
