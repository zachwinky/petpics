import { Suspense } from 'react';
import NavbarWrapper from '@/components/NavbarWrapper';
import OrderConfirmationContent from '@/components/PrintShop/OrderConfirmationContent';

/**
 * Post-Stripe-checkout confirmation page.
 * Server component renders the navbar, client component handles polling.
 */
export default function OrderConfirmationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50">
      <NavbarWrapper />
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <Suspense fallback={
          <>
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-3 border-coral-200 border-t-coral-500 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing your order...</h1>
          </>
        }>
          <OrderConfirmationContent />
        </Suspense>
      </main>
    </div>
  );
}
