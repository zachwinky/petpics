import { NextRequest, NextResponse } from 'next/server';
import { getVideoGenerationByFalRequestId, updateVideoGenerationStatus, updateUserCredits, getUserById } from '@/lib/db';
import { VIDEO_GENERATION_CREDITS } from '@/lib/videoPresets';

// This webhook is called by FAL when video generation completes
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify webhook secret - REQUIRED for production
    const webhookSecret = process.env.FAL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('FAL_WEBHOOK_SECRET not configured - rejecting webhook');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${webhookSecret}`) {
      console.error('Invalid webhook authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('FAL webhook received:', body.request_id, body.status);

    const { request_id, status, payload } = body;

    if (!request_id) {
      return NextResponse.json(
        { error: 'Missing request_id' },
        { status: 400 }
      );
    }

    // Find the video generation by FAL request ID
    const videoGeneration = await getVideoGenerationByFalRequestId(request_id);

    if (!videoGeneration) {
      console.error('Video generation not found for request_id:', request_id);
      return NextResponse.json(
        { error: 'Video generation not found' },
        { status: 404 }
      );
    }

    if (status === 'COMPLETED') {
      const videoUrl = payload?.video?.url;

      if (videoUrl) {
        await updateVideoGenerationStatus(videoGeneration.id, 'completed', videoUrl);
        console.log('Video generation completed:', videoGeneration.id, videoUrl);
      } else {
        // No video URL returned, mark as failed and refund
        await updateVideoGenerationStatus(videoGeneration.id, 'failed', undefined, 'No video URL returned');

        const user = await getUserById(videoGeneration.user_id);
        if (user) {
          await updateUserCredits(
            videoGeneration.user_id,
            VIDEO_GENERATION_CREDITS,
            'video',
            `Refund: Video generation completed but no video returned`
          );
        }
        console.log('Video generation failed (no URL):', videoGeneration.id);
      }
    } else if (status === 'FAILED') {
      const errorMessage = payload?.error || 'Video generation failed';
      await updateVideoGenerationStatus(videoGeneration.id, 'failed', undefined, errorMessage);

      // Refund credits
      const user = await getUserById(videoGeneration.user_id);
      if (user) {
        await updateUserCredits(
          videoGeneration.user_id,
          VIDEO_GENERATION_CREDITS,
          'video',
          `Refund: Video generation failed`
        );
      }
      console.log('Video generation failed:', videoGeneration.id, errorMessage);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('FAL webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
