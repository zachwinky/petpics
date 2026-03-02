import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, createStudioPortrait, logUserEvent } from '@/lib/db';

/**
 * POST /api/studio/save-portrait
 *
 * Saves a selected portrait from the Studio overlay to the user's gallery.
 *
 * Body: { modelId: number, generationId: number, imageIndex: number, imageUrl: string, sceneId?: string }
 * Returns: { success: true, portrait: StudioPortrait }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { modelId, generationId, imageIndex, imageUrl, sceneId } = body;

    if (!modelId || !imageUrl) {
      return NextResponse.json(
        { error: 'Must provide modelId and imageUrl' },
        { status: 400 }
      );
    }

    const portrait = await createStudioPortrait(
      userId,
      modelId,
      generationId || null,
      imageIndex || 0,
      imageUrl,
      sceneId
    );

    await logUserEvent(userId, 'portrait_selected', { model_id: modelId, scene_id: sceneId });

    return NextResponse.json({ success: true, portrait });
  } catch (error) {
    console.error('Save portrait error:', error);
    return NextResponse.json(
      { error: 'Failed to save portrait' },
      { status: 500 }
    );
  }
}
