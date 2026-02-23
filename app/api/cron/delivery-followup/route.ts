import { NextRequest, NextResponse } from 'next/server';
import { getShippedOrdersForFollowup, updatePrintOrderStatus, getAdminConfig, setAdminConfig } from '@/lib/db';
import { sendDeliveryFollowupEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find orders shipped more than 7 days ago
    const orders = await getShippedOrdersForFollowup();

    if (orders.length === 0) {
      return NextResponse.json({ message: 'No orders need followup', checked: true });
    }

    // Load already-sent followups to prevent duplicates
    const followupsSent = await getAdminConfig<Record<string, string>>('delivery_followups_sent') || {};

    // Clean up old entries (> 30 days) to prevent unbounded growth
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const [id, timestamp] of Object.entries(followupsSent)) {
      if (new Date(timestamp).getTime() < thirtyDaysAgo) {
        delete followupsSent[id];
      }
    }

    // Filter to orders that haven't received followup yet
    const pendingFollowups = orders.filter(o => !followupsSent[String(o.id)]);

    if (pendingFollowups.length === 0) {
      return NextResponse.json({
        message: 'All eligible orders already followed up',
        totalEligible: orders.length,
        checked: true,
      });
    }

    let sentCount = 0;

    for (const order of pendingFollowups) {
      try {
        await sendDeliveryFollowupEmail(
          order.user_email,
          order.user_name || '',
          order.id
        );

        // Mark order as delivered
        await updatePrintOrderStatus(order.id, 'delivered');

        // Record followup as sent
        followupsSent[String(order.id)] = new Date().toISOString();
        sentCount++;

        console.log(`[cron] Delivery followup sent for order ${order.id} to ${order.user_email}`);
      } catch (err) {
        console.error(`[cron] Failed to send followup for order ${order.id}:`, err);
        // Continue with other orders
      }
    }

    await setAdminConfig('delivery_followups_sent', followupsSent);

    return NextResponse.json({
      success: true,
      sentCount,
      totalEligible: orders.length,
    });
  } catch (error) {
    console.error('[cron] delivery-followup error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
