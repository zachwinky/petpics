'use client';

import { useState } from 'react';

const creditPackages = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 15,
    price: 12,
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 35,
    price: 30,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 105,
    price: 80,
  },
  {
    id: 'business',
    name: 'Business Pack',
    credits: 305,
    price: 200,
  },
];

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  required: number;
  current: number;
}

export default function CreditModal({ isOpen, onClose, required, current }: CreditModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          returnUrl: window.location.pathname, // Pass current page for dynamic redirect
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe - when they come back, they'll have credits
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to initiate purchase. Please try again.');
      setLoading(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const shortage = required - current;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Need More Credits</h2>
          <p className="text-gray-600">
            This action requires <strong className="text-indigo-600">{required} credits</strong>.
            {current > 0 ? (
              <> You have <strong className="text-gray-900">{current} credits</strong> (need {shortage} more).</>
            ) : (
              <> You currently have <strong className="text-gray-900">0 credits</strong>.</>
            )}
          </p>
        </div>

        {/* Credit packages */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {creditPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative border-2 rounded-lg p-4 ${
                pkg.popular
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  POPULAR
                </div>
              )}

              <div className="text-center">
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {pkg.name}
                </h3>
                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {pkg.credits}
                  </span>
                  <span className="text-gray-600 text-xs ml-1">credits</span>
                </div>
                <div className="text-lg font-bold text-indigo-600 mb-2">
                  ${pkg.price}
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  ${(pkg.price / pkg.credits).toFixed(2)}/credit
                </div>
                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loading !== null}
                  className={`w-full py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${
                    pkg.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                >
                  {loading === pkg.id ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </span>
                  ) : (
                    'Buy'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Credit usage info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2 text-sm">Credit Usage:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>Photo subject training: 10 credits</li>
            <li>Generate 4 images: 1 credit</li>
            <li>Generate 12 images: 3 credits</li>
            <li>Generate 20 images: 4 credits</li>
            <li>Video generation: 5 credits</li>
          </ul>
        </div>

        {/* Cancel button */}
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
