import ImageUpload from '@/components/ImageUpload';
import NavbarWrapper from '@/components/NavbarWrapper';
import WelcomeModalWrapper from '@/components/WelcomeModalWrapper';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <WelcomeModalWrapper />
      <NavbarWrapper />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900">
              AI Pet Photography
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Create stunning pet photos in any setting - no photoshoot required
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
                Add Your Pet
              </h2>
              <p className="text-gray-600">
                Upload 5-20 images of your pet to train the AI, then generate unlimited photos
              </p>

              <ImageUpload />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="text-3xl mb-3">🐾</div>
              <h3 className="font-semibold text-gray-900 mb-2">Your Exact Pet</h3>
              <p className="text-sm text-gray-600">
                The AI learns your specific pet - same markings, colors, and unique features
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="font-semibold text-gray-900 mb-2">Any Setting</h3>
              <p className="text-sm text-gray-600">
                Place your pet anywhere - parks, beaches, studios, or custom scenes
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold text-gray-900 mb-2">Fast Training</h3>
              <p className="text-sm text-gray-600">
                Training takes ~10 minutes, then generate unlimited variations instantly
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
