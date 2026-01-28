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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Buy Credits</h2>
      <p className="text-gray-600 mb-6">
        Purchase credits to create product photos and photo subjects
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {creditPackages.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative border-2 rounded-lg p-6 ${
              pkg.popular
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {pkg.popular && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                POPULAR
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {pkg.name}
              </h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">
                  {pkg.credits}
                </span>
                <span className="text-gray-600 ml-2">credits</span>
              </div>
              <div className="text-2xl font-bold text-indigo-600 mb-4">
                ${pkg.price.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 mb-6">
                ${(pkg.price / pkg.credits).toFixed(3)} per credit
              </div>
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading !== null}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  pkg.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
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

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Credit Usage:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Photo subject training: 10 credits</li>
          <li>• Generate 4 images: 1 credit</li>
          <li>• Generate 12 images: 3 credits</li>
          <li>• Generate 20 images: 4 credits</li>
          <li>• Video generation: 5 credits</li>
        </ul>
      </div>
    </div>
  );
}
