'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import NavbarWrapper from '@/components/NavbarWrapper';

/**
 * Post-Stripe-checkout confirmation page.
 * Polls for the order to be created by the webhook, then redirects to the order detail page.
 */
export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    let attempts = 0;
    const maxAttempts = 8; // 8 x 2.5s = 20s max wait
    let cancelled = false;

    const poll = async () => {
      while (attempts < maxAttempts && !cancelled) {
        attempts++;
        try {
          const res = await fetch(`/api/print/order-status?session_id=${sessionId}`);
          const data = await res.json();
          if (data.found && data.orderId) {
            window.location.href = `/print/order/${data.orderId}?new=1`;
            return;
          }
        } catch {
          // Keep polling
        }
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
      if (!cancelled) {
        setTimedOut(true);
      }
    };

    poll();

    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50">
      <NavbarWrapper />
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        {!timedOut ? (
          <>
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-3 border-coral-200 border-t-coral-500 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing your order...</h1>
            <p className="text-gray-600">
              This usually takes just a few seconds.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">&#x1F389;</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
            <p className="text-gray-600 mb-6">
              Your order is being processed. You&apos;ll receive a confirmation email shortly
              with your order details and tracking information.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-coral-500 text-white font-semibold rounded-xl hover:bg-coral-600 transition-colors"
            >
              Back to Dashboard
            </a>
          </>
        )}
      </main>
    </div>
  );
}
