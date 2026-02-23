import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NavbarWrapper from '@/components/NavbarWrapper';
import ProductSelector from '@/components/PrintShop/ProductSelector';

export default async function PrintConfigurePage({
  searchParams,
}: {
  searchParams: Promise<{ image?: string; generationId?: string; imageIndex?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const params = await searchParams;
  const imageUrl = params.image;
  const generationId = params.generationId ? parseInt(params.generationId) : 0;
  const imageIndex = params.imageIndex ? parseInt(params.imageIndex) : 0;

  if (!imageUrl) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <NavbarWrapper />
      <ProductSelector
        imageUrl={imageUrl}
        generationId={generationId}
        imageIndex={imageIndex}
      />
    </div>
  );
}
