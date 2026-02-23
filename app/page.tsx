import ImageUpload from '@/components/ImageUpload';
import NavbarWrapper from '@/components/NavbarWrapper';
import HeroGallery from '@/components/HeroGallery';
import HowItWorks from '@/components/HowItWorks';
import SocialProof from '@/components/SocialProof';

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
            <p className="text-sm text-gray-500">Prints from $24.99 + shipping</p>
          </div>

          {/* Example Gallery */}
          <HeroGallery />

          {/* Social Proof — sample prints with captions */}
          <SocialProof />

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

          {/* Trust line */}
          <p className="text-center text-sm text-gray-400">
            Printed &amp; shipped from the US &middot; Satisfaction guaranteed
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <svg className="w-8 h-8 text-coral-500 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.35 3c-.76 0-1.38.67-1.27 1.42l.17 1.15C5.4 6.4 4 8.17 4 10.2c0 .55.45 1 1 1s1-.45 1-1c0-1.1.6-2.1 1.57-2.68l-.06.48c-.12.75.46 1.42 1.22 1.42.6 0 1.1-.43 1.22-1.02l.32-1.6c.8-.12 1.65-.12 2.46 0l.32 1.6c.11.59.62 1.02 1.22 1.02.76 0 1.34-.67 1.22-1.42l-.06-.48C17.4 8.1 18 9.1 18 10.2c0 .55.45 1 1 1s1-.45 1-1c0-2.03-1.4-3.8-3.25-4.63l.17-1.15c.11-.75-.51-1.42-1.27-1.42-.6 0-1.1.43-1.22 1.02L14.1 5.6c-.68-.2-1.38-.33-2.1-.33s-1.42.13-2.1.33l-.33-1.58C9.45 3.43 8.95 3 8.35 3ZM12 13.5c-3.87 0-7 2.24-7 5 0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5 0-2.76-3.13-5-7-5Z"/>
              </svg>
              <h3 className="font-semibold text-gray-900 mb-2">Your Actual Pet</h3>
              <p className="text-sm text-gray-600">
                The AI learns your specific pet — same markings, colors, and personality captured perfectly
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <svg className="w-8 h-8 text-coral-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
              <h3 className="font-semibold text-gray-900 mb-2">Beautiful Scenes</h3>
              <p className="text-sm text-gray-600">
                Golden hour, cozy home, flower fields — choose from 12 curated portrait scenes
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-coral-50">
              <svg className="w-8 h-8 text-coral-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
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
