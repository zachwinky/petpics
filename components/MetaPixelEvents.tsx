'use client';

import { useEffect } from 'react';

export default function MetaPixelEvents() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' && window.fbq) {
      window.fbq('track', 'Purchase', { currency: 'USD', value: 0 });
    }
  }, []);

  return null;
}
