'use client';

import { useState, useEffect } from 'react';
import { MINI_MOCKUPS } from '@/components/PrintShop/MiniMockups';

const PRODUCT_TYPE_INFO: Record<string, { label: string; description: string }> = {
  canvas: { label: 'Canvas', description: 'Stretched gallery wrap' },
  framed_poster: { label: 'Framed Print', description: 'With premium frame' },
  poster: { label: 'Poster', description: 'Enhanced matte paper' },
  mug: { label: 'Mug', description: 'White glossy ceramic' },
};

const PRODUCT_TYPE_ORDER = ['canvas', 'framed_poster', 'poster', 'mug'];

interface ProductPickerProps {
  petName: string;
  previewImageUrl?: string;
  onProductSelected: (productType: string) => void;
}

export default function ProductPicker({ petName, previewImageUrl, onProductSelected }: ProductPickerProps) {
  const [startingPrices, setStartingPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Fallback image for mockup previews
  const mockupImage = previewImageUrl || '/placeholder-pet.png';

  useEffect(() => {
    fetch('/api/print/products')
      .then(res => res.json())
      .then(data => {
        const products = data.products || [];
        const prices: Record<string, number> = {};
        for (const type of PRODUCT_TYPE_ORDER) {
          const typeProducts = products.filter((p: { product_type: string }) => p.product_type === type);
          if (typeProducts.length > 0) {
            prices[type] = Math.min(...typeProducts.map((p: { price_cents: number }) => p.price_cents));
          }
        }
        setStartingPrices(prices);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-6 px-4">
        <h2 className="text-white text-xl font-semibold mb-1">
          What would you like to create?
        </h2>
        <p className="text-white/60 text-sm">
          Choose a product for {petName}&apos;s portrait
        </p>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {PRODUCT_TYPE_ORDER.map(type => {
            const info = PRODUCT_TYPE_INFO[type];
            const startPrice = startingPrices[type];
            const MiniMockup = MINI_MOCKUPS[type];

            return (
              <button
                key={type}
                onClick={() => onProductSelected(type)}
                className="p-4 pt-5 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-center"
              >
                {MiniMockup && <MiniMockup imageUrl={mockupImage} />}
                <div className="text-sm font-semibold text-white mb-0.5">{info.label}</div>
                <div className="text-[11px] text-white/40 mb-2">{info.description}</div>
                {loading ? (
                  <div className="h-5 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/50 animate-spin" />
                  </div>
                ) : startPrice ? (
                  <div className="text-sm font-medium text-white/80">
                    From ${(startPrice / 100).toFixed(2)}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
