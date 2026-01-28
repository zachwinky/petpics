import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { auth } from '@/lib/auth';
import { getUserById, getVideoGenerationById, updateVideoGenerationStatus, updateUserCredits } from '@/lib/db';
import { VIDEO_GENERATION_CREDITS } from '@/lib/videoPresets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const videoId = parseInt(id);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    const videoGeneration = await getVideoGenerationById(videoId, userId);

    if (!videoGeneration) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // If video is already completed or failed, return current status
    if (videoGeneration.status === 'completed' || videoGeneration.status === 'failed') {
      return NextResponse.json({
        id: videoGeneration.id,
        status: videoGeneration.status,
        videoUrl: videoGeneration.video_url,
        errorMessage: videoGeneration.error_message,
        createdAt: videoGeneration.created_at,
        completedAt: videoGeneration.completed_at,
      });
    }

    // If processing, check status with FAL
    if (videoGeneration.fal_request_id && videoGeneration.status === 'processing') {
      const apiKey = process.env.FAL_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'FAL API key not configured' },
          { status: 500 }
        );
      }

      fal.config({ credentials: apiKey });

      try {
        const statusResponse = await fal.queue.status('fal-ai/wan/v2.2-5b/image-to-video', {
          requestId: videoGeneration.fal_request_id,
          logs: true,
        });

        const currentStatus = statusResponse.status as string;
        console.log('Video generation status:', currentStatus, 'for request:', videoGeneration.fal_request_id);

        if (currentStatus === 'COMPLETED') {
          // Get the result
          const result = await fal.queue.result('fal-ai/wan/v2.2-5b/image-to-video', {
            requestId: videoGeneration.fal_request_id,
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const videoUrl = (result.data as any)?.video?.url;

          if (videoUrl) {
            await updateVideoGenerationStatus(videoId, 'completed', videoUrl);
            return NextResponse.json({
              id: videoGeneration.id,
              status: 'completed',
              videoUrl: videoUrl,
              createdAt: videoGeneration.created_at,
            });
          } else {
            // No video URL returned, mark as failed
            await updateVideoGenerationStatus(videoId, 'failed', undefined, 'No video URL returned');
            // Refund credits
            await updateUserCredits(
              userId,
              VIDEO_GENERATION_CREDITS,
              'video',
              `Refund: Video generation completed but no video returned`
            );
            return NextResponse.json({
              id: videoGeneration.id,
              status: 'failed',
              errorMessage: 'Video generation completed but no video was returned. Credits have been refunded.',
              createdAt: videoGeneration.created_at,
            });
          }
        } else if (currentStatus === 'FAILED') {
          await updateVideoGenerationStatus(videoId, 'failed', undefined, 'FAL generation failed');
          // Refund credits
          await updateUserCredits(
            userId,
            VIDEO_GENERATION_CREDITS,
            'video',
            `Refund: Video generation failed`
          );
          return NextResponse.json({
            id: videoGeneration.id,
            status: 'failed',
            errorMessage: 'Video generation failed. Credits have been refunded.',
            createdAt: videoGeneration.created_at,
          });
        } else {
          // Still processing
          return NextResponse.json({
            id: videoGeneration.id,
            status: 'processing',
            queueStatus: currentStatus,
            createdAt: videoGeneration.created_at,
          });
        }
      } catch (falError) {
        console.error('Error checking FAL status:', falError);
        return NextResponse.json({
          id: videoGeneration.id,
          status: 'processing',
          message: 'Unable to check status, please try again',
          createdAt: videoGeneration.created_at,
        });
      }
    }

    // Return current status
    return NextResponse.json({
      id: videoGeneration.id,
      status: videoGeneration.status,
      videoUrl: videoGeneration.video_url,
      errorMessage: videoGeneration.error_message,
      createdAt: videoGeneration.created_at,
      completedAt: videoGeneration.completed_at,
    });

  } catch (error) {
    console.error('Error getting video status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
