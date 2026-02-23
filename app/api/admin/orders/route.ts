import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { getAllPrintOrders, updatePrintOrderStatus } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await getAllPrintOrders(100);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Admin orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, status, trackingNumber, trackingUrl } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId and status are required' }, { status: 400 });
    }

    const validStatuses = ['payment_confirmed', 'submitted_to_printful', 'in_production', 'shipped', 'delivered', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await updatePrintOrderStatus(orderId, status, trackingNumber, trackingUrl);

    return NextResponse.json({ success: true, message: `Order ${orderId} updated to ${status}` });
  } catch (error) {
    console.error('Admin order update error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
