import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateModelNotes, updateModelPreview, deleteModel, getModelById } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const modelId = parseInt(id);
    const body = await request.json();
    const { notes, preview_image_url } = body;

    // Verify the model belongs to the user (pass userId to prevent IDOR)
    const model = await getModelById(modelId, userId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    let updatedModel;

    // Update preview_image_url if provided (including null to delete)
    if ('preview_image_url' in body) {
      updatedModel = await updateModelPreview(modelId, userId, preview_image_url);
    } else if (notes !== undefined) {
      // Update notes if provided
      updatedModel = await updateModelNotes(modelId, userId, notes || '');
    }

    return NextResponse.json({
      success: true,
      model: updatedModel,
    });

  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const modelId = parseInt(id);

    // Verify the model belongs to the user (pass userId to prevent IDOR)
    const model = await getModelById(modelId, userId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    const deleted = await deleteModel(modelId, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete model' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Model deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      { error: 'Failed to delete model', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
