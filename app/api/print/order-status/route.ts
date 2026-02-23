import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { getPrintOrderByStripePaymentIntent } from '@/lib/db';

/**
 * GET /api/print/order-status?session_id=X
 *
 * Polls for order creation after Stripe checkout.
 * Returns { found: true, orderId } when the webhook has processed,
 * or { found: false } if still pending.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId = checkoutSession.payment_intent as string;

    if (!paymentIntentId) {
      return NextResponse.json({ found: false });
    }

    const order = await getPrintOrderByStripePaymentIntent(paymentIntentId);
    if (order) {
      return NextResponse.json({ found: true, orderId: order.id });
    }

    return NextResponse.json({ found: false });
  } catch {
    return NextResponse.json({ found: false });
  }
}
