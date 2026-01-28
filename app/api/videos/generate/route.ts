import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { auth } from '@/lib/auth';
import { getUserById, updateUserCredits, createVideoGeneration, updateVideoGenerationFalRequestId } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';
import { VIDEO_GENERATION_CREDITS } from '@/lib/videoPresets';

// Video generation can take a while, set max duration
export const maxDuration = 60;

// Input validation constants
const MAX_PROMPT_LENGTH = 500;
const ALLOWED_IMAGE_DOMAINS = [
  'fal.media',
  'replicate.delivery',
  'storage.googleapis.com',
  'res.cloudinary.com',
  'v0.blob.vercel-storage.com',
];

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
    if (user.credits_balance < VIDEO_GENERATION_CREDITS) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: VIDEO_GENERATION_CREDITS,
          current: user.credits_balance
        },
        { status: 402 }
      );
    }

    // Rate limiting: 5 video generation requests per hour per IP
    const rateLimitResult = await rateLimit(request, 5, 60 * 60 * 1000);
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        {
          error: 'Video generation rate limit exceeded. You can generate 5 videos per hour.',
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
    const { imageUrl, prompt, modelId } = body;

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: 'Image URL and prompt are required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate imageUrl format and domain (prevent SSRF)
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: 'Invalid image URL protocol' },
          { status: 400 }
        );
      }
      const isAllowedDomain = ALLOWED_IMAGE_DOMAINS.some(domain =>
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
      );
      if (!isAllowedDomain) {
        return NextResponse.json(
          { error: 'Image URL domain not allowed' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid image URL format' },
        { status: 400 }
      );
    }

    // SECURITY: Validate prompt length (prevent DoS via huge prompts)
    if (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt must be a string with maximum ${MAX_PROMPT_LENGTH} characters` },
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

    // Deduct credits first
    try {
      await updateUserCredits(
        userId,
        -VIDEO_GENERATION_CREDITS,
        'video',
        `Video generation from image`
      );
    } catch (error) {
      console.error('Error deducting credits:', error);
      return NextResponse.json(
        { error: 'Failed to deduct credits. Please try again.' },
        { status: 500 }
      );
    }

    // Create video generation record
    const videoGeneration = await createVideoGeneration(
      userId,
      modelId || null,
      imageUrl,
      prompt,
      VIDEO_GENERATION_CREDITS
    );

    // Configure fal client
    fal.config({ credentials: apiKey });

    // Submit video generation to FAL queue
    console.log('Submitting video generation to FAL queue...');

    try {
      const { request_id } = await fal.queue.submit('fal-ai/wan/v2.2-5b/image-to-video', {
        input: {
          prompt: prompt,
          image_url: imageUrl,
        },
      });

      console.log('Video generation submitted with request_id:', request_id);

      // Update the video generation record with the FAL request ID
      await updateVideoGenerationFalRequestId(videoGeneration.id, userId, request_id);

      return NextResponse.json({
        success: true,
        videoId: videoGeneration.id,
        requestId: request_id,
        status: 'processing',
        message: 'Video generation started. This may take a few minutes.',
      });
    } catch (falError) {
      console.error('FAL API error:', falError);

      // Refund credits on failure
      await updateUserCredits(
        userId,
        VIDEO_GENERATION_CREDITS,
        'video',
        `Refund: Video generation failed to start`
      );

      return NextResponse.json(
        { error: 'Failed to start video generation. Credits have been refunded.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
