import { NextRequest, NextResponse } from 'next/server';
import { getActiveTrainingsForCompletion } from '@/lib/admin';
import { getAdminConfig, setAdminConfig, PendingTraining } from '@/lib/db';
import { sendStuckTrainingAlertEmail } from '@/lib/email';
import { checkAndCompleteTraining } from '@/lib/training-completion';

// Need 300s for sample image generation + watermarking + email
export const maxDuration = 300;

const STUCK_THRESHOLD_MINUTES = 20;

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active trainings (status = 'training')
    const activeTrainings = await getActiveTrainingsForCompletion();

    if (activeTrainings.length === 0) {
      return NextResponse.json({ message: 'No active trainings', checked: true });
    }

    console.log(`[cron] Found ${activeTrainings.length} active training(s), checking FAL status...`);

    const results: { id: number; triggerWord: string; outcome: string }[] = [];

    // Try to complete each training by checking FAL status
    for (const training of activeTrainings) {
      try {
        // Convert to PendingTraining shape expected by checkAndCompleteTraining
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
          results.push({ id: training.id, triggerWord: training.trigger_word, outcome: 'completed' });
          console.log(`[cron] Training ${training.id} (${training.trigger_word}) auto-completed`);
        } else if (failed) {
          results.push({ id: training.id, triggerWord: training.trigger_word, outcome: 'failed' });
          console.log(`[cron] Training ${training.id} (${training.trigger_word}) marked as failed`);
        } else {
          results.push({ id: training.id, triggerWord: training.trigger_word, outcome: 'still_pending' });
        }
      } catch (error) {
        console.error(`[cron] Error processing training ${training.id}:`, error);
        results.push({ id: training.id, triggerWord: training.trigger_word, outcome: 'error' });
      }
    }

    // Alert admin about trainings still stuck after completion attempts
    const stillPending = results.filter(r => r.outcome === 'still_pending' || r.outcome === 'error');
    const now = Date.now();

    if (stillPending.length > 0) {
      const stuckTrainings = activeTrainings.filter(t => {
        const isStillPending = stillPending.some(r => r.id === t.id);
        const minutesOld = (now - new Date(t.created_at).getTime()) / 60000;
        return isStillPending && minutesOld > STUCK_THRESHOLD_MINUTES;
      });

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
            const alertTo = adminEmails[0];

            if (alertTo) {
              const alertData = newStuck.map(t => ({
                id: t.id,
                userEmail: t.user_email,
                triggerWord: t.trigger_word,
                minutesElapsed: Math.round((now - new Date(t.created_at).getTime()) / 60000),
              }));

              await sendStuckTrainingAlertEmail(alertTo, alertData);

              for (const t of newStuck) {
                alertsSent[String(t.id)] = new Date().toISOString();
              }
              await setAdminConfig('stuck_training_alerts_sent', alertsSent);
              console.log(`[cron] Stuck training alert sent for ${newStuck.length} training(s)`);
            }
          }
        } catch (alertError) {
          console.error('[cron] Failed to send stuck training alert:', alertError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: activeTrainings.length,
      results,
    });
  } catch (error) {
    console.error('[cron] check-stuck-trainings error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
