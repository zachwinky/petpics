import ImageUpload from '@/components/ImageUpload';
import NavbarWrapper from '@/components/NavbarWrapper';
import HeroGallery from '@/components/HeroGallery';
import HowItWorks from '@/components/HowItWorks';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-white to-coral-50 relative overflow-hidden">
      {/* Decorative paw prints - hidden on mobile near top to avoid clipping with headline */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-20 left-[5%] text-coral-200 text-4xl opacity-40 rotate-[-15deg] hidden md:block">🐾</div>
        <div className="absolute top-40 right-[8%] text-peach-300 text-3xl opacity-30 rotate-[20deg] hidden md:block">🐾</div>
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
              AI-generated portraits of your pet, printed on canvas, poster, or mug and shipped to your door
            </p>
          </div>

          {/* Example Gallery */}
          <HeroGallery />

          {/* Upload CTA - right after gallery on mobile, after everything on desktop */}
          <div className="md:hidden bg-white rounded-2xl shadow-xl p-6 border border-coral-100">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Ready to Get Started?
                </h2>
                <p className="text-gray-600">
                  Upload 5-20 photos of your pet, pick your favorite portrait, and we'll print it for you
                </p>
              </div>
              <ImageUpload />
            </div>
          </div>

          {/* How It Works */}
          <HowItWorks />

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <div className="text-3xl mb-3">🐾</div>
              <h3 className="font-semibold text-gray-900 mb-2">Your Actual Pet</h3>
              <p className="text-sm text-gray-600">
                The AI learns your specific pet — same markings, colors, and personality captured perfectly
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="font-semibold text-gray-900 mb-2">Beautiful Scenes</h3>
              <p className="text-sm text-gray-600">
                Golden hour, cozy home, flower fields — choose from 12 curated portrait scenes
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <div className="text-3xl mb-3">🖼️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Gallery-Quality Prints</h3>
              <p className="text-sm text-gray-600">
                Canvas, framed poster, matte print, or mug — shipped to your door in days
              </p>
            </div>
          </div>

          {/* Upload CTA - desktop only (mobile version is above) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-xl p-8 border border-coral-100">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-semibold text-gray-800 mb-2">
                  Ready to Get Started?
                </h2>
                <p className="text-gray-600">
                  Upload 5-20 photos of your pet, pick your favorite portrait, and we'll print it for you
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
