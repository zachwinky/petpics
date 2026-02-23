'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackPrintPurchase } from '@/components/MetaPixelEvents';
import { useCart } from '@/lib/cart-context';

interface PrintPurchaseEventProps {
  totalCents: number;
}

/**
 * Fires Meta Pixel Purchase event and clears cart on the order page when arriving from checkout.
 * Only fires when ?new=1 is in the URL (set by the confirmation redirect).
 */
export default function PrintPurchaseEvent({ totalCents }: PrintPurchaseEventProps) {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      clearCart();
      if (totalCents > 0) {
        trackPrintPurchase(totalCents);
      }
    }
  }, [searchParams, totalCents, clearCart]);

  return null;
}
