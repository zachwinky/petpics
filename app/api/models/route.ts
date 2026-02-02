import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserModels } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const models = await getUserModels(userId);

    return NextResponse.json({
      models: models.map(model => ({
        id: model.id,
        name: model.name,
        trigger_word: model.trigger_word,
        preview_image_url: model.preview_image_url,
      })),
    });

  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
