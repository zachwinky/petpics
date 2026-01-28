import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserById, getUserModels, getModelGenerationCount, getUserPendingTrainings } from '@/lib/db';
import CreditPurchase from '@/components/CreditPurchase';
import NavbarWrapper from '@/components/NavbarWrapper';
import ModelsGrid from '@/components/ModelsGrid';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await getUserById(parseInt(session.user.id));
  if (!user) {
    redirect('/auth/signin');
  }

  const models = await getUserModels(user.id);
  const pendingTrainings = await getUserPendingTrainings(user.id);

  // Get generation counts for each model
  const modelsWithCounts = await Promise.all(
    models.map(async (model) => ({
      ...model,
      generationCount: await getModelGenerationCount(model.id, user.id),
    }))
  );

  const totalGenerations = modelsWithCounts.reduce((sum, model) => sum + model.generationCount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <NavbarWrapper />
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          {/* Header - Simplified for mobile */}
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Welcome back, {user.name || user.email}</p>
          </div>

          {/* Primary Actions - Top Priority on Mobile */}
          <div className="space-y-4">
            {/* Train New Model */}
            <a
              href="/"
              className="block w-full px-6 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg text-center text-lg"
            >
              🎨 Train New Pet
            </a>

            {/* Generate from Existing Models */}
            {models.length > 0 && (
              <a
                href="/generate"
                className="block w-full px-6 py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors shadow-lg text-center text-lg"
              >
                📸 Generate Pet Photos
              </a>
            )}
          </div>

          {/* My Models */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900">My Pets</h2>
              {models.length > 0 && (
                <a
                  href="/"
                  className="px-3 py-2 text-sm bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  + Add
                </a>
              )}
            </div>

            {models.length === 0 && pendingTrainings.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="text-5xl md:text-6xl mb-3 md:mb-4">🎯</div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No pets yet</h3>
                <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Train your first pet to get started</p>
              </div>
            ) : (
              <ModelsGrid initialModels={modelsWithCounts} initialPendingTrainings={pendingTrainings} />
            )}
          </div>

          {/* Stats Grid - Moved to bottom */}
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-200">
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">🎨</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{models.length}</div>
              <div className="text-xs md:text-sm text-gray-600">Pets</div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-200">
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">📸</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{totalGenerations}</div>
              <div className="text-xs md:text-sm text-gray-600">Pet Photos</div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-200">
              <div className="text-2xl md:text-3xl mb-1 md:mb-2">💎</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{user.credits_balance}</div>
              <div className="text-xs md:text-sm text-gray-600">Credits</div>
            </div>
          </div>

          {/* Credit Purchase - Bottom */}
          <div id="buy-credits">
            <CreditPurchase />
          </div>
        </div>
      </main>
    </div>
  );
}
