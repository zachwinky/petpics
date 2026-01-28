import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, getUserVideoGenerations, getModelVideoGenerations } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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

    // Check if filtering by modelId
    const { searchParams } = new URL(request.url);
    const modelIdParam = searchParams.get('modelId');

    let videos;
    if (modelIdParam) {
      const modelId = parseInt(modelIdParam);
      if (isNaN(modelId)) {
        return NextResponse.json(
          { error: 'Invalid model ID' },
          { status: 400 }
        );
      }
      videos = await getModelVideoGenerations(modelId, userId);
    } else {
      videos = await getUserVideoGenerations(userId);
    }

    // Transform for client
    const videosForClient = videos.map(video => ({
      id: video.id,
      modelId: video.model_id,
      sourceImageUrl: video.source_image_url,
      motionPrompt: video.motion_prompt,
      status: video.status,
      videoUrl: video.video_url,
      errorMessage: video.error_message,
      creditsUsed: video.credits_used,
      createdAt: video.created_at,
      completedAt: video.completed_at,
    }));

    return NextResponse.json({
      videos: videosForClient,
    });

  } catch (error) {
    console.error('Error getting videos:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
