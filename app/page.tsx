import ImageUpload from '@/components/ImageUpload';
import NavbarWrapper from '@/components/NavbarWrapper';
import HeroGallery from '@/components/HeroGallery';
import HowItWorks from '@/components/HowItWorks';

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
      <NavbarWrapper />
      <main className="container mx-auto px-4 py-8 md:py-16 relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">

          {/* Hero Headline */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Turn Your Pet Into a Work of Art
            </h1>
            <p className="text-lg md:text-2xl text-gray-600 max-w-3xl mx-auto">
              Stunning portraits of your pet in any style, any setting — no studio needed
            </p>
          </div>

          {/* Example Gallery */}
          <HeroGallery />

          {/* How It Works */}
          <HowItWorks />

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
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

          {/* Upload CTA */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-coral-100">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">
                  Ready to Get Started?
                </h2>
                <p className="text-gray-600">
                  Upload 5-20 photos of your pet to train the AI, then create unlimited pictures
                </p>
              </div>

              <ImageUpload />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
