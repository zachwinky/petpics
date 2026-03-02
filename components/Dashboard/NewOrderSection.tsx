'use client';

import { useState, useEffect } from 'react';
import type { StudioModel } from '@/components/Studio/StudioOverlay';

interface NewOrderSectionProps {
  hasModels: boolean;
  models: StudioModel[];
  onOpenStudio: (model: StudioModel, productType: string) => void;
  onAddPet: () => void;
  onPickModel: (productType: string) => void;
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
  { type: 'canvas', image: '/products/canvas-mockup.png', name: 'Canvas', key: 'canvas' as const },
  { type: 'poster', image: '/products/poster-mockup.png', name: 'Poster', key: 'poster' as const },
  { type: 'mug', image: '/products/mug-mockup.png', name: 'Mug', key: 'mug' as const },
];

export default function NewOrderSection({ hasModels, models, onOpenStudio, onAddPet, onPickModel }: NewOrderSectionProps) {
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
      if (models.length > 1) {
        // Multiple pets — let user pick which one
        onPickModel(productType);
      } else {
        // Single pet — open studio directly
        onOpenStudio(models[0], productType);
      }
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
            <div className="dash-product-mini-icon">
              <img src={product.image} alt={product.name} className="dash-product-mini-img" />
            </div>
            <div className="dash-product-mini-name">{product.name}</div>
            <div className="dash-product-mini-price">From {prices[product.key]} + shipping</div>
          </button>
        ))}
        {!hasModels && (
          <div className="dash-product-mini dash-product-placeholder" onClick={onAddPet}>
            <svg viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="dash-product-placeholder-dog">
              <ellipse cx="100" cy="120" rx="65" ry="60" stroke="#d4a574" strokeWidth="3" fill="#fdf6f0" />
              <path d="M45 95 C30 55, 50 40, 65 75" stroke="#d4a574" strokeWidth="3" fill="#f5e6d8" strokeLinecap="round" />
              <path d="M155 95 C170 55, 150 40, 135 75" stroke="#d4a574" strokeWidth="3" fill="#f5e6d8" strokeLinecap="round" />
              <circle cx="78" cy="110" r="8" fill="#8b7355" />
              <circle cx="81" cy="108" r="3" fill="white" />
              <circle cx="122" cy="110" r="8" fill="#8b7355" />
              <circle cx="125" cy="108" r="3" fill="white" />
              <ellipse cx="100" cy="132" rx="10" ry="7" fill="#8b7355" />
              <path d="M100 139 C100 145, 88 150, 85 145" stroke="#8b7355" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M100 139 C100 145, 112 150, 115 145" stroke="#8b7355" strokeWidth="2" fill="none" strokeLinecap="round" />
              <ellipse cx="100" cy="152" rx="6" ry="8" fill="#e8845c" opacity="0.7" />
              <circle cx="100" cy="115" r="90" stroke="#d4a574" strokeWidth="2" strokeDasharray="8 6" opacity="0.4" />
            </svg>
            <div className="dash-product-mini-name" style={{ color: 'var(--lp-accent-coral)' }}>Upload your pet first</div>
          </div>
        )}
      </div>
    </div>
  );
}
