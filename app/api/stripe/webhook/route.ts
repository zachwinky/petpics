import { NextRequest, NextResponse } from 'next/server';
import { stripe, creditPackages } from '@/lib/stripe';
import { updateUserCredits } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // SECURITY: Verify webhook secret is configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const credits = session.metadata?.credits;
    const packageId = session.metadata?.packageId;

    if (!userId || !credits || !packageId) {
      console.error('Missing metadata in checkout session');
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    // SECURITY: Validate userId and credits are valid positive numbers
    const parsedUserId = parseInt(userId);
    const parsedCredits = parseInt(credits);

    if (isNaN(parsedUserId) || parsedUserId <= 0) {
      console.error('Invalid userId in metadata:', userId);
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (isNaN(parsedCredits) || parsedCredits <= 0) {
      console.error('Invalid credits in metadata:', credits);
      return NextResponse.json({ error: 'Invalid credits value' }, { status: 400 });
    }

    // SECURITY: Verify packageId matches an actual package and credits match expected value
    const validPackage = creditPackages.find(p => p.id === packageId);
    if (!validPackage) {
      console.error('Invalid packageId in metadata:', packageId);
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    if (validPackage.credits !== parsedCredits) {
      console.error('Credits mismatch - expected:', validPackage.credits, 'received:', parsedCredits);
      return NextResponse.json({ error: 'Credits mismatch' }, { status: 400 });
    }

    try {
      // Add credits to user account
      await updateUserCredits(
        parsedUserId,
        parsedCredits,
        'purchase',
        `Purchased ${packageId} package`,
        session.amount_total ? session.amount_total / 100 : undefined,
        session.payment_intent as string
      );

      console.log(`Successfully added ${credits} credits to user ${userId}`);
    } catch (error) {
      console.error('Error updating user credits:', error);
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
