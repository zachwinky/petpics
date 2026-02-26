'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthModalProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthModalProvider>
    </SessionProvider>
  );
}
