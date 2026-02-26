'use client';

import { useCart } from '@/lib/cart-context';

export default function CartView() {
  const { items, removeItem, subtotalCents, itemCount } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-600 mb-6">Create some portraits and add them to your cart.</p>
        <a
          href="/dashboard"
          className="inline-block px-6 py-3 bg-coral-500 text-white font-semibold rounded-xl hover:bg-coral-600 transition-colors"
        >
          Create Portraits
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})</h1>

      {/* Cart items */}
      <div className="space-y-4 mb-8">
        {items.map(item => (
          <div
            key={item.id}
            className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100"
          >
            {/* Thumbnail */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={item.mockupUrl || item.imageUrl} alt="Product" className="w-full h-full object-cover" />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{item.displayName}</div>
              <div className="text-sm text-gray-500">
                {item.sizeLabel}
                {item.options?.frameColor && ` · ${item.options.frameColor} frame`}
              </div>
              <div className="text-sm font-medium text-gray-900 mt-1">
                ${(item.priceCents / 100).toFixed(2)}
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeItem(item.id)}
              className="text-gray-400 hover:text-red-500 transition-colors self-start"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${(subtotalCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span className="text-gray-500">Calculated at checkout</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between text-base">
            <span className="font-semibold text-gray-900">Estimated Total</span>
            <span className="font-bold text-gray-900">${(subtotalCents / 100).toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-400 text-center">
          Ships directly to you from our US print facility
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <a
          href="/print/checkout"
          className="block w-full py-4 rounded-xl bg-coral-500 text-white font-semibold text-center text-base hover:bg-coral-600 active:scale-[0.98] transition-all"
        >
          Proceed to Checkout →
        </a>
        <a
          href="/dashboard"
          className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Add another portrait
        </a>
      </div>
    </div>
  );
}
