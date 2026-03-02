import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logUserEvent } from '@/lib/db';

// Allowed client-side events (whitelist to prevent abuse)
const ALLOWED_EVENTS = [
  'photos_selected',
  'studio_opened',
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, metadata } = await request.json();

    if (!event || !ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);
    await logUserEvent(userId, event, metadata || {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}
