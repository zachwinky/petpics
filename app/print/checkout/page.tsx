import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NavbarWrapper from '@/components/NavbarWrapper';
import CheckoutForm from '@/components/PrintShop/CheckoutForm';

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50">
      <NavbarWrapper />
      <main className="py-8">
        <CheckoutForm />
      </main>
    </div>
  );
}
