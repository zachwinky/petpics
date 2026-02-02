import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserGenerations } from '@/lib/db';

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
    const generations = await getUserGenerations(userId, 200); // Get up to 200 generations

    return NextResponse.json({
      generations: generations.map(gen => ({
        id: gen.id,
        model_id: gen.model_id,
        image_urls: gen.image_urls,
        created_at: gen.created_at,
      })),
    });

  } catch (error) {
    console.error('Error fetching generations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generations' },
      { status: 500 }
    );
  }
}
