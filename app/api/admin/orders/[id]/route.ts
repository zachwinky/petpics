import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getPrintOrderById, getOrderItems, getUserById } from '@/lib/db';

/**
 * GET /api/admin/orders/[id]
 *
 * Returns full order detail including items (with image URLs), user info,
 * and all shipping/payment data. Used by admin dashboard for order recovery.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    // Fetch order without user filter (admin access)
    const order = await getPrintOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const [items, user] = await Promise.all([
      getOrderItems(orderId),
      getUserById(order.user_id),
    ]);

    return NextResponse.json({
      order,
      items,
      user: user ? { id: user.id, email: user.email, name: user.name } : null,
    });
  } catch (error) {
    console.error('Admin order detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
