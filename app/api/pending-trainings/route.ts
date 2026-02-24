import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPendingTrainings, getUserById, getAdminConfig, setAdminConfig } from '@/lib/db';
import { sendStuckTrainingAlertEmail } from '@/lib/email';
import { checkAndCompleteTraining } from '@/lib/training-completion';

// Allow up to 300s for this endpoint - it may need to generate sample images + watermark + send email
export const maxDuration = 300;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const user = await getUserById(userId);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get pending trainings
  let pendingTrainings = await getUserPendingTrainings(userId);

  // Check status of each pending training and complete if done
  // This triggers the sample image generation and email sending
  for (const training of pendingTrainings) {
    const { completed, failed } = await checkAndCompleteTraining(
      training,
      userId,
      user.email,
      user.name || ''
    );

    if (completed || failed) {
      // Refresh the list after completion
      pendingTrainings = await getUserPendingTrainings(userId);
    }
  }

  // Check for stuck trainings (> 20 min) and alert admin
  const TWENTY_MINUTES = 20 * 60 * 1000;
  const now = Date.now();
  const stuckTrainings = pendingTrainings.filter(
    t => t.status === 'training' && (now - new Date(t.created_at).getTime()) > TWENTY_MINUTES
  );

  if (stuckTrainings.length > 0) {
    try {
      const alertsSent = await getAdminConfig<Record<string, string>>('stuck_training_alerts_sent') || {};

      // Clean up old entries (> 24h)
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      for (const [id, timestamp] of Object.entries(alertsSent)) {
        if (new Date(timestamp).getTime() < oneDayAgo) {
          delete alertsSent[id];
        }
      }

      const newStuck = stuckTrainings.filter(t => !alertsSent[String(t.id)]);

      if (newStuck.length > 0) {
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
        if (adminEmails[0]) {
          const alertData = newStuck.map(t => ({
            id: t.id,
            userEmail: user.email,
            triggerWord: t.trigger_word,
            minutesElapsed: Math.round((now - new Date(t.created_at).getTime()) / 60000),
          }));

          await sendStuckTrainingAlertEmail(adminEmails[0], alertData);

          for (const t of newStuck) {
            alertsSent[String(t.id)] = new Date().toISOString();
          }
          await setAdminConfig('stuck_training_alerts_sent', alertsSent);
          console.log(`[pending-trainings] Stuck training alert sent for ${newStuck.length} training(s)`);
        }
      }
    } catch (alertError) {
      console.error('[pending-trainings] Failed to send stuck training alert:', alertError);
    }
  }

  return NextResponse.json({ pendingTrainings });
}
