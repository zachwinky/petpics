import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe, creditPackages } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId, returnUrl } = await req.json();

    const creditPackage = creditPackages.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    // Validate returnUrl is a safe internal path (starts with /)
    const safePath = returnUrl && typeof returnUrl === 'string' && returnUrl.startsWith('/')
      ? returnUrl
      : '/dashboard';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: creditPackage.name,
              description: `${creditPackage.credits} credits for AI product photography`,
            },
            unit_amount: Math.round(creditPackage.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}${safePath}?payment=success`,
      cancel_url: `${baseUrl}${safePath}?payment=cancelled`,
      metadata: {
        userId: session.user.id,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
