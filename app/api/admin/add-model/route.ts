import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { createModel } from '@/lib/db';

// Admin endpoint to manually add a model (for recovering from failed training flows)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, loraUrl, triggerWord, name, trainingImagesCount } = body;

    if (!userId || !loraUrl || !triggerWord) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, loraUrl, triggerWord' },
        { status: 400 }
      );
    }

    const modelName = name || `Photo Subject ${triggerWord}`;
    const imagesCount = trainingImagesCount || 5;

    const model = await createModel(
      parseInt(userId),
      modelName,
      loraUrl,
      triggerWord,
      imagesCount
    );

    return NextResponse.json({
      success: true,
      model,
      message: `Model "${modelName}" added successfully for user ${userId}`,
    });

  } catch (error) {
    console.error('Error adding model:', error);
    return NextResponse.json(
      { error: 'Failed to add model', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
