import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin, getPrintAnnouncementEligibleUsers } from '@/lib/admin';
import { getAdminConfig, setAdminConfig } from '@/lib/db';
import { sendPrintAnnouncementEmail } from '@/lib/email';

// Allow enough time for batch email sending
export const maxDuration = 60;

// GET: Fetch eligible users for print announcement
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await getPrintAnnouncementEligibleUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching print announcement users:', error);
    return NextResponse.json({ error: 'Failed to fetch eligible users' }, { status: 500 });
  }
}

// DELETE: Reset sent tracking (so you can re-send after failures)
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await setAdminConfig('print_announcement_sent_users', {});
    return NextResponse.json({ success: true, message: 'Sent tracking reset' });
  } catch (error) {
    console.error('Error resetting print announcement tracking:', error);
    return NextResponse.json({ error: 'Failed to reset tracking' }, { status: 500 });
  }
}

// POST: Send print announcement emails to selected users
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds must be a non-empty array' }, { status: 400 });
    }

    // Load eligible users for lookup
    const allEligible = await getPrintAnnouncementEligibleUsers();
    const eligibleMap = new Map(allEligible.map(u => [u.id, u]));

    // Load current sent map
    const sentMap = await getAdminConfig<Record<string, { sentAt: string; sentBy: string }>>(
      'print_announcement_sent_users'
    ) || {};

    const results: { userId: number; email: string; success: boolean; error?: string }[] = [];

    for (const userId of userIds) {
      const eligible = eligibleMap.get(userId);
      if (!eligible) {
        results.push({ userId, email: 'unknown', success: false, error: 'User not eligible or not found' });
        continue;
      }

      const petName = eligible.pet_names[0] || 'your pet';

      try {
        console.log(`[print-announcement] Sending to ${eligible.email}, pet: ${petName}`);

        await sendPrintAnnouncementEmail(eligible.email, eligible.name || '', petName);

        // Mark as sent
        sentMap[String(userId)] = {
          sentAt: new Date().toISOString(),
          sentBy: session.user.email,
        };

        console.log(`[print-announcement] Email sent to ${eligible.email}`);
        results.push({ userId, email: eligible.email, success: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[print-announcement] Failed for user ${userId}:`, msg);
        results.push({ userId, email: eligible.email, success: false, error: msg });
      }
    }

    // Persist sent map
    await setAdminConfig('print_announcement_sent_users', sentMap);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} emails, ${errorCount} failed`,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error('Error sending print announcement emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
