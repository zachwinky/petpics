import NavbarWrapper from '@/components/NavbarWrapper';
import PhotoUploader from '@/components/PrintShop/PhotoUploader';

export default async function PrintUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-gray-950">
      <NavbarWrapper />
      <PhotoUploader initialProductType={params.product} />
    </div>
  );
}
