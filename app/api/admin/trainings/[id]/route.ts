import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin, refundTraining, updateTrainingStatus, getActiveTrainingById } from '@/lib/admin';
import { checkAndCompleteTraining } from '@/lib/training-completion';
import { PendingTraining } from '@/lib/db';

// Need 300s for force_complete (sample generation + watermarking + email)
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const trainingId = parseInt(id);

    if (isNaN(trainingId)) {
      return NextResponse.json(
        { error: 'Invalid training ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, status, errorMessage } = body;

    if (action === 'refund') {
      const result = await refundTraining(trainingId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: result.message });
    }

    if (action === 'force_complete') {
      // Full completion flow: check FAL → create model → generate samples → send email
      const training = await getActiveTrainingById(trainingId);

      if (!training) {
        return NextResponse.json(
          { error: 'Training not found' },
          { status: 404 }
        );
      }

      if (!training.fal_request_id) {
        return NextResponse.json(
          { error: 'Training has no FAL request ID' },
          { status: 400 }
        );
      }

      const dbTraining: PendingTraining = {
        id: training.id,
        user_id: training.user_id,
        fal_request_id: training.fal_request_id,
        trigger_word: training.trigger_word,
        model_name: training.model_name,
        images_count: training.images_count,
        status: training.status as PendingTraining['status'],
        pet_type: training.pet_type as PendingTraining['pet_type'],
        created_at: training.created_at,
      };

      const { completed, failed } = await checkAndCompleteTraining(
        dbTraining,
        training.user_id,
        training.user_email,
        training.user_name
      );

      if (completed) {
        return NextResponse.json({ message: `Training ${training.trigger_word} completed successfully. Model created and email sent.` });
      } else if (failed) {
        return NextResponse.json({ message: `Training ${training.trigger_word} failed on FAL. User notified.` });
      } else {
        return NextResponse.json({ message: `Training ${training.trigger_word} is still in progress on FAL. Try again later.` });
      }
    }

    if (action === 'update_status') {
      const validStatuses = ['training', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
          { status: 400 }
        );
      }

      const result = await updateTrainingStatus(trainingId, status, errorMessage);

      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: result.message });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Admin training action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
