import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { upsertCartSnapshot } from '@/lib/db';

/**
 * POST /api/cart/sync
 *
 * Fire-and-forget sync of localStorage cart to server for admin visibility.
 * Body: { items: CartItem[], itemCount: number, totalCents: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { items, itemCount, totalCents } = body;

    if (!Array.isArray(items) || typeof itemCount !== 'number' || typeof totalCents !== 'number') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await upsertCartSnapshot(userId, items, itemCount, totalCents);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Cart sync error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
