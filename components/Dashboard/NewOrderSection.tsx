'use client';

import { useState, useEffect } from 'react';
import type { StudioModel } from '@/components/Studio/StudioOverlay';

interface NewOrderSectionProps {
  hasModels: boolean;
  models: StudioModel[];
  onOpenStudio: (model: StudioModel, productType: string) => void;
  onAddPet: () => void;
}

interface ProductPricing {
  canvas: string;
  poster: string;
  mug: string;
}

const FALLBACK_PRICES: ProductPricing = {
  canvas: '$34.99',
  poster: '$24.99',
  mug: '$24.99',
};

const PRODUCTS = [
  { type: 'canvas', icon: '🖼️', name: 'Canvas', key: 'canvas' as const },
  { type: 'poster', icon: '🎨', name: 'Poster', key: 'poster' as const },
  { type: 'mug', icon: '☕', name: 'Mug', key: 'mug' as const },
];

export default function NewOrderSection({ hasModels, models, onOpenStudio, onAddPet }: NewOrderSectionProps) {
  const [prices, setPrices] = useState<ProductPricing>(FALLBACK_PRICES);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/print/products');
        if (!res.ok) return;
        const data = await res.json();
        const products: { product_type: string; price_cents: number }[] = data.products || [];
        const minByType: Record<string, number> = {};
        for (const p of products) {
          if (!minByType[p.product_type] || p.price_cents < minByType[p.product_type]) {
            minByType[p.product_type] = p.price_cents;
          }
        }
        const format = (cents: number) => {
          const dollars = cents / 100;
          return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
        };
        setPrices({
          canvas: minByType['canvas'] ? format(minByType['canvas']) : FALLBACK_PRICES.canvas,
          poster: minByType['poster'] ? format(minByType['poster']) : FALLBACK_PRICES.poster,
          mug: minByType['mug'] ? format(minByType['mug']) : FALLBACK_PRICES.mug,
        });
      } catch {
        // Use fallback prices
      }
    }
    fetchPrices();
  }, []);

  const handleProductClick = (productType: string) => {
    if (hasModels && models.length > 0) {
      // If user has exactly one model, open studio directly
      // If multiple, use the first one (TODO: could show a model picker)
      onOpenStudio(models[0], productType);
    } else {
      // No models — store product and scroll to upload section
      localStorage.setItem('selectedProduct', productType);
      onAddPet();
    }
  };

  return (
    <div className="dash-section" id="new-order">
      <div className="dash-section-header">
        <div>
          <div className="dash-section-tag">New Order</div>
          <h2>{hasModels ? 'Create another masterpiece' : 'Create your first masterpiece'}</h2>
        </div>
      </div>

      <div className="dash-products-mini">
        {PRODUCTS.map(product => (
          <button
            key={product.type}
            className="dash-product-mini"
            onClick={() => handleProductClick(product.type)}
          >
            <div className="dash-product-mini-icon">{product.icon}</div>
            <div className="dash-product-mini-name">{product.name}</div>
            <div className="dash-product-mini-price">From {prices[product.key]} + shipping</div>
          </button>
        ))}
      </div>
    </div>
  );
}
