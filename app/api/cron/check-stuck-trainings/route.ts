import { NextRequest, NextResponse } from 'next/server';
import { getStuckTrainings } from '@/lib/admin';
import { getAdminConfig, setAdminConfig } from '@/lib/db';
import { sendStuckTrainingAlertEmail } from '@/lib/email';

const STUCK_THRESHOLD_MINUTES = 20;

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find trainings stuck for more than 20 minutes
    const stuckTrainings = await getStuckTrainings(STUCK_THRESHOLD_MINUTES);

    if (stuckTrainings.length === 0) {
      return NextResponse.json({ message: 'No stuck trainings', checked: true });
    }

    // Load already-alerted training IDs to avoid repeat alerts
    const alertsSent = await getAdminConfig<Record<string, string>>('stuck_training_alerts_sent') || {};

    // Clean up old entries (> 24h) to prevent unbounded growth
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, timestamp] of Object.entries(alertsSent)) {
      if (new Date(timestamp).getTime() < oneDayAgo) {
        delete alertsSent[id];
      }
    }

    // Filter to only new (not yet alerted) stuck trainings
    const newStuck = stuckTrainings.filter(t => !alertsSent[String(t.id)]);

    if (newStuck.length === 0) {
      // All stuck trainings already alerted
      return NextResponse.json({
        message: 'All stuck trainings already alerted',
        stuckCount: stuckTrainings.length,
        checked: true,
      });
    }

    // Build alert data
    const now = Date.now();
    const alertData = newStuck.map(t => ({
      id: t.id,
      userEmail: t.user_email,
      triggerWord: t.trigger_word,
      minutesElapsed: Math.round((now - new Date(t.created_at).getTime()) / 60000),
    }));

    // Send alert to first admin email
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    const alertTo = adminEmails[0];

    if (!alertTo) {
      console.error('[cron] No ADMIN_EMAILS configured');
      return NextResponse.json({ error: 'No admin email configured' }, { status: 500 });
    }

    await sendStuckTrainingAlertEmail(alertTo, alertData);

    // Mark these trainings as alerted
    for (const t of newStuck) {
      alertsSent[String(t.id)] = new Date().toISOString();
    }
    await setAdminConfig('stuck_training_alerts_sent', alertsSent);

    console.log(`[cron] Stuck training alert sent to ${alertTo} for ${newStuck.length} training(s)`);

    return NextResponse.json({
      success: true,
      alerted: alertData,
      alertedCount: newStuck.length,
      totalStuck: stuckTrainings.length,
    });
  } catch (error) {
    console.error('[cron] check-stuck-trainings error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
