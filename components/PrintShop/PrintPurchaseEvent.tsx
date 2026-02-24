'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackPrintPurchase, trackGoogleAdsPurchase } from '@/components/MetaPixelEvents';
import { useCart } from '@/lib/cart-context';

interface PrintPurchaseEventProps {
  totalCents: number;
  orderId: number;
}

/**
 * Fires Meta Pixel + Google Ads conversion events and clears cart on the order page.
 * Only fires when ?new=1 is in the URL (set by the confirmation redirect).
 */
export default function PrintPurchaseEvent({ totalCents, orderId }: PrintPurchaseEventProps) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      clearCart();
      if (totalCents > 0) {
        trackPrintPurchase(totalCents);
        trackGoogleAdsPurchase(totalCents, orderId);
      }
    }
  }, [searchParams, totalCents, orderId, clearCart]);

  return null;
}
