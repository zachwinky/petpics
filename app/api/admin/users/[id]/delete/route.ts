import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getUserById, deleteUserCompletely } from '@/lib/db';

// DELETE /api/admin/users/[id]/delete — Hard delete user and all data
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

    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (isAdmin(user.email)) {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 400 });
    }

    const deleted = await deleteUserCompletely(userId);
    if (!deleted) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: `User ${user.email} permanently deleted.` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('Delete user error:', error);
    return NextResponse.json({ error: msg }, { status: msg.includes('active print orders') ? 400 : 500 });
  }
}
