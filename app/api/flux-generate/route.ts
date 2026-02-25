import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { rateLimit } from '@/lib/rateLimit';
import { auth } from '@/lib/auth';
import { getUserById, createGeneration, getModelById } from '@/lib/db';
import { getImageDimensions, DEFAULT_ASPECT_RATIO } from '@/lib/platformPresets';

const MAX_PROMPT_LENGTH = 500;

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

    // Rate limiting: 10 generations per minute per IP
    const rateLimitResult = await rateLimit(request, 10, 60000);
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
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

    const body = await request.json();
    const { modelId, triggerWord, prompt, aspectRatio } = body;

    // Get image dimensions based on selected aspect ratio
    const imageSize = getImageDimensions(aspectRatio || DEFAULT_ASPECT_RATIO);

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt required' },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or less` },
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

    // Fetch model from DB — always use DB loraUrl, never trust client
    const model = await getModelById(modelId, userId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    const loraUrl = model.lora_url;

    // Build prompt with product description for text accuracy (if available)
    let fullPrompt = `Professional pet photography of ${triggerWord}, ${prompt}, high quality, detailed, studio lighting`;
    if (model.product_description && model.product_description !== 'NO_TEXT_VISIBLE') {
      fullPrompt = `Professional pet photography of ${triggerWord} with text ${model.product_description}, ${prompt}, high quality, detailed, studio lighting`;
    }

    const result = await fal.subscribe('fal-ai/flux-lora', {
      input: {
        prompt: fullPrompt,
        loras: [
          {
            path: loraUrl,
            scale: 1.0,
          },
        ],
        image_size: imageSize,
        num_inference_steps: 40,
        guidance_scale: 5.5,
        num_images: 4, // Generate 4 images per request (FAL API max)
        output_format: 'png',
      },
      logs: true,
    });

    // Extract generated images
    const images = result.data.images;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images generated' },
        { status: 500 }
      );
    }

    const imageUrls = images.map((img: any) => img.url);

    // Record generation in database
    try {
      await createGeneration(
        userId,
        modelId || null,
        null,
        prompt,
        imageUrls,
        0
      );
    } catch (error) {
      console.error('Error recording generation:', error);
    }

    return NextResponse.json({
      success: true,
      imageUrls,
      seed: result.data.seed,
    });

  } catch (error) {
    console.error('Error generating image:', error);

    // If it's a FAL API error, extract more details
    if (error && typeof error === 'object' && 'body' in error) {
      console.error('FAL API error body:', JSON.stringify((error as any).body, null, 2));
    }

    return NextResponse.json(
      {
        error: 'Generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
