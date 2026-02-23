import NavbarWrapper from '@/components/NavbarWrapper';
import CartView from '@/components/PrintShop/CartView';

export default function CartPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50">
      <NavbarWrapper />
      <main className="py-8">
        <CartView />
      </main>
    </div>
  );
}
