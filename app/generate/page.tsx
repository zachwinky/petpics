import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserById, getUserModels } from '@/lib/db';
import NavbarWrapper from '@/components/NavbarWrapper';
import GenerateInterface from '@/components/GenerateInterface';

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ modelId?: string }>;
}) {
  const { modelId } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await getUserById(parseInt(session.user.id));
  if (!user) {
    redirect('/auth/signin');
  }

  const models = await getUserModels(user.id);

  // If a specific model is selected, find it
  const selectedModelId = modelId ? parseInt(modelId) : null;
  const selectedModel = selectedModelId
    ? models.find((m) => m.id === selectedModelId)
    : models[0]; // Default to first model if no selection

  if (!selectedModel && models.length === 0) {
    redirect('/'); // Redirect to add a photo subject if none exist
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <NavbarWrapper />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900">Generate Photos</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2">
              Create stunning pet photos with your trained pet model
            </p>
          </div>

          <GenerateInterface models={models} selectedModel={selectedModel} />
        </div>
      </main>
    </div>
  );
}
