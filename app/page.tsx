import ImageUpload from '@/components/ImageUpload';
import NavbarWrapper from '@/components/NavbarWrapper';
import WelcomeModalWrapper from '@/components/WelcomeModalWrapper';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50 relative overflow-hidden">
      {/* Decorative paw prints */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-20 left-[5%] text-coral-200 text-4xl opacity-40 rotate-[-15deg]">🐾</div>
        <div className="absolute top-40 right-[8%] text-peach-300 text-3xl opacity-30 rotate-[20deg]">🐾</div>
        <div className="absolute top-[60%] left-[3%] text-coral-200 text-5xl opacity-25 rotate-[-25deg]">🐾</div>
        <div className="absolute top-[45%] right-[5%] text-peach-200 text-4xl opacity-35 rotate-[10deg]">🐾</div>
        <div className="absolute bottom-32 left-[12%] text-coral-100 text-3xl opacity-40 rotate-[30deg]">🐾</div>
        <div className="absolute bottom-20 right-[15%] text-peach-200 text-4xl opacity-30 rotate-[-10deg]">🐾</div>
      </div>
      <WelcomeModalWrapper />
      <NavbarWrapper />
      <main className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900">
              Pet Photography, Powered by AI
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Beautiful photos of your pet in any setting - no studio needed
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-coral-100">
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                Add Your Pet
              </h2>
              <p className="text-gray-600">
                Upload 5-20 photos of your pet to train the AI, then create unlimited pictures
              </p>

              <ImageUpload />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <div className="text-3xl mb-3">🐾</div>
              <h3 className="font-semibold text-gray-900 mb-2">Your Actual Pet</h3>
              <p className="text-sm text-gray-600">
                The AI learns your specific pet - same markings, colors, and unique features
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="font-semibold text-gray-900 mb-2">Any Setting</h3>
              <p className="text-sm text-gray-600">
                Place your pet anywhere - parks, beaches, studios, or custom scenes
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold text-gray-900 mb-2">Quick Setup</h3>
              <p className="text-sm text-gray-600">
                Training takes about 10 minutes, then create as many photos as you want
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
