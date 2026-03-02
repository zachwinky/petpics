import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getUserById, banUser, unbanUser } from '@/lib/db';

// POST /api/admin/users/[id]/ban — Ban a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (isAdmin(user.email)) {
      return NextResponse.json({ error: 'Cannot ban admin users' }, { status: 400 });
    }

    const banned = await banUser(userId, session.user.email);
    if (!banned) return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });

    return NextResponse.json({ success: true, banned_at: banned.banned_at });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]/ban — Unban a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    const unbanned = await unbanUser(userId);
    if (!unbanned) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unban user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
