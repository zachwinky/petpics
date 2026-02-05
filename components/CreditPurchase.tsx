'use client';

import { useState } from 'react';

const creditPackages = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 15,
    price: 8.99,
    oldPrice: 12,
    description: 'Great for trying it out',
  },
  {
    id: 'popular',
    name: 'Popular',
    credits: 45,
    price: 24.99,
    oldPrice: 30,
    popular: true,
    description: 'Most popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 110,
    price: 64.99,
    oldPrice: 80,
    description: 'For power users',
  },
  {
    id: 'business',
    name: 'Studio',
    credits: 305,
    price: 179.99,
    oldPrice: 200,
    description: 'Go all out',
  },
];

export default function CreditPurchase() {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();

      if (data.url) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-coral-100 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Buy Credits</h2>
      <p className="text-gray-600 mb-6">
        Purchase credits to train pets and create photos
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {creditPackages.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative border-2 rounded-lg p-6 ${
              pkg.popular
                ? 'border-coral-500 bg-coral-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {pkg.popular && (
              <div className="absolute top-0 right-0 bg-coral-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                POPULAR
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {pkg.name}
              </h3>
              <p className="text-xs text-gray-500 mb-3">{pkg.description}</p>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">
                  {pkg.credits}
                </span>
                <span className="text-gray-600 ml-2">credits</span>
              </div>
              <div className="mb-4">
                <span className="text-sm text-gray-400 line-through mr-2">
                  ${pkg.oldPrice.toFixed(2)}
                </span>
                <span className="text-2xl font-bold text-coral-600">
                  ${pkg.price.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-500 mb-6">
                ${(pkg.price / pkg.credits).toFixed(3)} per credit
              </div>
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading !== null}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  pkg.popular
                    ? 'bg-coral-500 text-white hover:bg-coral-600'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
              >
                {loading === pkg.id ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
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
                    Processing...
                  </span>
                ) : (
                  'Purchase'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-coral-50 border border-coral-200 rounded-lg">
        <h4 className="font-semibold text-coral-900 mb-2">Credit Usage:</h4>
        <ul className="text-sm text-coral-800 space-y-1">
          <li>🐾 Train a new pet: 10 credits</li>
          <li>📸 Create 4 photos: 1 credit</li>
          <li>📸 Create 12 photos: 3 credits</li>
          <li>📸 Create 20 photos: 4 credits</li>
          <li>🎬 Create a video: 5 credits</li>
        </ul>
      </div>
    </div>
  );
}
