'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'petpics_welcome_dismissed';

interface WelcomeModalProps {
  onClose?: () => void;
}

export default function WelcomeModal({ onClose }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the modal before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsOpen(false);
    onClose?.();
  };

  const handleNext = () => {
    if (currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (!isOpen) return null;

  const slides = [
    // Slide 1: Hero
    <div key="slide1" className="text-center px-6 py-8">
      <div className="mb-6">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-coral-400 to-peach-500 rounded-2xl flex items-center justify-center">
          <span className="text-5xl">🐾</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Create Beautiful Pet Photos
      </h2>
      <p className="text-gray-600 max-w-sm mx-auto">
        Upload photos of your pet and create amazing images for social media, gifts, and memories.
      </p>
    </div>,

    // Slide 2: How it works
    <div key="slide2" className="px-6 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-coral-100 rounded-full flex items-center justify-center">
            <span className="text-coral-600 font-bold">1</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Upload Photos</h3>
            <p className="text-sm text-gray-600">Take 5-20 photos of your pet from different angles</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-coral-100 rounded-full flex items-center justify-center">
            <span className="text-coral-600 font-bold">2</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Training</h3>
            <p className="text-sm text-gray-600">We train the AI to recognize your pet (about 10 min)</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-coral-100 rounded-full flex items-center justify-center">
            <span className="text-coral-600 font-bold">3</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Create Photos</h3>
            <p className="text-sm text-gray-600">Generate photos in any setting you can imagine</p>
          </div>
        </div>
      </div>
    </div>,

    // Slide 3: Tips
    <div key="slide3" className="px-6 py-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Tips for Best Results</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-mint-50 border border-mint-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-mint-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium text-gray-800 text-sm">Do</span>
          </div>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>Multiple angles</li>
            <li>Good, natural lighting</li>
            <li>Plain backgrounds</li>
            <li>Sharp, clear images</li>
          </ul>
        </div>
        <div className="bg-coral-50 border border-coral-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-coral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium text-gray-800 text-sm">Avoid</span>
          </div>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>Blurry or dark photos</li>
            <li>Heavy filters</li>
            <li>Multiple pets</li>
            <li>Busy backgrounds</li>
          </ul>
        </div>
      </div>
      <p className="text-center text-sm text-gray-500">
        More photos = better results!
      </p>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Slide content */}
        <div className="relative">
          {slides[currentSlide]}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-coral-500' : 'bg-gray-300'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors font-medium"
            >
              {currentSlide === 2 ? "Get Started" : "Next"}
            </button>
          </div>

          {/* Don't show again */}
          <label className="flex items-center justify-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-coral-500 border-gray-300 rounded focus:ring-coral-400"
            />
            <span className="text-sm text-gray-500">Don&apos;t show this again</span>
          </label>
        </div>
      </div>
    </div>
  );
}
