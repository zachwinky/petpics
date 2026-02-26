'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCart } from '@/lib/cart-context';
import { trackBeginCheckout, trackAddShippingInfo } from '@/components/MetaPixelEvents';

interface ShippingRate {
  id: string;
  name: string;
  priceCents: number;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  minDeliveryDate?: string;
  maxDeliveryDate?: string;
}

interface ShippingAddress {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export default function CheckoutForm() {
  const { items, subtotalCents, clearCart } = useCart();

  const [address, setAddress] = useState<ShippingAddress>({
    name: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US',
  });
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingRate | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsState = address.country === 'US' || address.country === 'CA';
  const isAddressComplete = address.name && address.address1 && address.city && address.zip && address.country
    && (!needsState || address.state);

  // Fire InitiateCheckout pixel event on mount
  useEffect(() => {
    if (subtotalCents > 0) {
      trackBeginCheckout(subtotalCents);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch shipping rates when address is complete
  useEffect(() => {
    if (!isAddressComplete || items.length === 0) return;

    const timer = setTimeout(async () => {
      setLoadingRates(true);
      try {
        const response = await fetch('/api/print/shipping-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            items: items.map(item => ({
              variantId: item.variantId,
              quantity: 1,
            })),
          }),
        });
        const data = await response.json();
        setShippingRates(data.rates || []);
        if (data.rates?.length > 0) {
          setSelectedShipping(data.rates[0]); // Pre-select cheapest
          trackAddShippingInfo();
        }
      } catch {
        // Don't use a fallback rate — real rates prevent pricing mismatch
        setShippingRates([]);
        setError('Unable to calculate shipping rates. Please check your address and try again.');
      } finally {
        setLoadingRates(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [address.name, address.address1, address.city, address.state, address.zip, address.country, items, isAddressComplete]);

  const shippingCents = selectedShipping?.priceCents || 0;
  const totalCents = subtotalCents + shippingCents;

  const formatDeliveryDate = (rate: ShippingRate) => {
    if (rate.minDeliveryDate && rate.maxDeliveryDate) {
      const min = new Date(rate.minDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const max = new Date(rate.maxDeliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `Arrives ${min} – ${max}`;
    }
    return `${rate.minDeliveryDays}–${rate.maxDeliveryDays} business days`;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddressComplete || !selectedShipping || processing) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/print/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            imageUrl: item.imageUrl,
            generationId: item.generationId,
            imageIndex: item.imageIndex,
            productType: item.productType,
            productId: item.productId,
            sizeLabel: item.sizeLabel,
            variantId: item.variantId,
            priceCents: item.priceCents,
            options: item.options,
            mockupUrl: item.mockupUrl,
          })),
          address,
          shippingMethod: selectedShipping.id,
          shippingCents: selectedShipping.priceCents,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Redirect to Stripe checkout (cart cleared on confirmation page, not here —
      // if user cancels payment on Stripe, their cart should still have items)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.orderId) {
        clearCart();
        window.location.href = `/print/order/${data.orderId}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setProcessing(false);
    }
  }, [items, address, selectedShipping, processing, isAddressComplete, clearCart]);

  const updateField = (field: keyof ShippingAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <a href="/dashboard" className="text-coral-600 hover:text-coral-700">Back to dashboard</a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
          {/* Left: Form sections */}
          <div className="space-y-8">
            {/* Section 1: Shipping Address */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="space-y-3">
                <input
                  type="text" placeholder="Full name" required
                  value={address.name} onChange={e => updateField('name', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-coral-400 focus:ring-1 focus:ring-coral-400 outline-none text-sm"
                />
                <input
                  type="text" placeholder="Address line 1" required
                  value={address.address1} onChange={e => updateField('address1', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-coral-400 focus:ring-1 focus:ring-coral-400 outline-none text-sm"
                />
                <input
                  type="text" placeholder="Address line 2 (optional)"
                  value={address.address2} onChange={e => updateField('address2', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-coral-400 focus:ring-1 focus:ring-coral-400 outline-none text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text" placeholder="City" required
                    value={address.city} onChange={e => updateField('city', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-coral-400 focus:ring-1 focus:ring-coral-400 outline-none text-sm"
                  />
                  <input
                    type="text" placeholder={needsState ? 'State *' : 'State / Province'}
                    required={needsState}
                    value={address.state} onChange={e => updateField('state', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-coral-400 focus:ring-1 focus:ring-coral-400 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text" placeholder="ZIP / Postal code" required
                    value={address.zip} onChange={e => updateField('zip', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-coral-400 focus:ring-1 focus:ring-coral-400 outline-none text-sm"
                  />
                  <select
                    value={address.country} onChange={e => updateField('country', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-coral-400 focus:ring-1 focus:ring-coral-400 outline-none text-sm"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Shipping Method */}
            {shippingRates.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping Method</h2>
                <div className="space-y-2">
                  {shippingRates.map(rate => (
                    <label
                      key={rate.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedShipping?.id === rate.id
                          ? 'border-coral-400 bg-coral-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping?.id === rate.id}
                          onChange={() => setSelectedShipping(rate)}
                          className="accent-coral-500"
                        />
                        <div>
                          <div className="text-sm font-medium">{rate.name}</div>
                          <div className="text-xs text-gray-500">{formatDeliveryDate(rate)}</div>
                        </div>
                      </div>
                      <span className="text-sm font-medium">${(rate.priceCents / 100).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {loadingRates && isAddressComplete && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                  <span className="text-sm">Calculating shipping rates...</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order summary (sticky) */}
          <div className="md:sticky md:top-8 h-fit">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

              {/* Mini item list */}
              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={item.mockupUrl || item.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.displayName}</div>
                      <div className="text-xs text-gray-500">{item.sizeLabel}</div>
                    </div>
                    <div className="text-xs font-medium">${(item.priceCents / 100).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <hr className="my-3" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{selectedShipping ? `$${(shippingCents / 100).toFixed(2)}` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-xs text-gray-400">Calculated at checkout</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>${(totalCents / 100).toFixed(2)}</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isAddressComplete || !selectedShipping || processing}
                className={`w-full mt-6 py-4 rounded-xl font-semibold text-base transition-all ${
                  processing
                    ? 'bg-gray-400 text-white cursor-wait'
                    : !isAddressComplete || !selectedShipping
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-coral-500 text-white hover:bg-coral-600 active:scale-[0.98]'
                }`}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Place Order — $${(totalCents / 100).toFixed(2)}`
                )}
              </button>

              {/* Trust signals */}
              <div className="mt-4 text-center text-xs text-gray-400 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Secure checkout &middot; Satisfaction guaranteed
                </div>
                <p>Ships directly from our US print facility</p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
