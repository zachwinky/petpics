'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCart } from '@/lib/cart-context';
import { trackSelectProduct, trackAddToCart } from '@/components/MetaPixelEvents';
import { MINI_MOCKUPS } from './MiniMockups';
import {
  LargeCanvasMockup, LargeFramedMockup, LargePosterMockup, LargeMugMockup,
  PRINTFUL_PRODUCT_IDS,
} from './LargeMockups';

interface Product {
  id: number;
  product_type: string;
  display_name: string;
  size_label: string;
  printful_variant_id: number;
  price_cents: number;
  min_image_width_px: number;
  min_image_height_px: number;
  orientation?: string;
  options: Record<string, unknown>;
}

interface ProductSelectorProps {
  imageUrl: string;
  generationId: number;
  imageIndex: number;
  initialProductType?: string;
  initialMockupUrl?: string;
}

const PRODUCT_TYPE_INFO: Record<string, { label: string; description: string }> = {
  canvas: { label: 'Canvas', description: 'Stretched gallery wrap' },
  framed_poster: { label: 'Framed Print', description: 'With premium frame' },
  poster: { label: 'Poster', description: 'Enhanced matte paper' },
  mug: { label: 'Mug', description: 'White glossy ceramic' },
};

const PRODUCT_TYPE_ORDER = ['canvas', 'framed_poster', 'poster', 'mug'];

// Max upscaled resolution from 1024px source with 4x upscale
const MAX_UPSCALED_PX = 4096;

function getQualityLabel(product: Product): { label: string; color: string } | null {
  const needed = Math.max(product.min_image_width_px, product.min_image_height_px);
  if (needed <= 0) return null;
  if (MAX_UPSCALED_PX >= needed) {
    return { label: 'Best quality', color: 'text-green-500' };
  }
  if (MAX_UPSCALED_PX >= needed * 0.75) {
    return { label: 'Good quality', color: 'text-green-400' };
  }
  return { label: 'May appear soft', color: 'text-yellow-400' };
}

// --- Printful mockup hook ---

function usePrintfulMockup(
  imageUrl: string,
  selectedType: string | null,
  selectedProduct: Product | null,
  initialMockupUrl?: string,
) {
  const [mockupUrl, setMockupUrl] = useState<string | null>(initialMockupUrl || null);
  const [loading, setLoading] = useState(false);
  const [usedInitial, setUsedInitial] = useState(!!initialMockupUrl);

  useEffect(() => {
    // If we have an initial mockup URL from the Studio, skip the first fetch
    if (usedInitial) {
      setUsedInitial(false);
      return;
    }

    if (!selectedType || !selectedProduct) {
      setMockupUrl(null);
      return;
    }

    const printfulProductId = PRINTFUL_PRODUCT_IDS[selectedType];
    if (!printfulProductId) return;

    let cancelled = false;
    setLoading(true);
    setMockupUrl(null);

    fetch('/api/print/mockup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl,
        productId: printfulProductId,
        variantIds: [selectedProduct.printful_variant_id],
      }),
    })
      .then(res => {
        if (!res.ok) {
          console.warn('Mockup API returned', res.status);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!cancelled && data?.mockupUrl) {
          setMockupUrl(data.mockupUrl);
        }
      })
      .catch((err) => {
        console.warn('Mockup fetch failed:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [imageUrl, selectedType, selectedProduct?.printful_variant_id, selectedProduct, usedInitial]);

  return { mockupUrl, loading };
}

// --- Main component ---

export default function ProductSelector({ imageUrl, generationId, imageIndex, initialProductType, initialMockupUrl }: ProductSelectorProps) {
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(initialProductType || null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [frameColor, setFrameColor] = useState('black');

  const { mockupUrl, loading: mockupLoading } = usePrintfulMockup(imageUrl, selectedType, selectedProduct, initialMockupUrl);

  // Fetch products from API
  useEffect(() => {
    fetch('/api/print/products')
      .then(res => res.json())
      .then(data => {
        const prods = data.products || [];
        setProducts(prods);
        // Auto-select first size variant when initialProductType is provided
        if (initialProductType && !selectedProduct) {
          const typeProducts = prods.filter((p: Product) => p.product_type === initialProductType);
          if (typeProducts.length > 0) {
            setSelectedProduct(typeProducts[0]);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group products by type
  const productsByType = PRODUCT_TYPE_ORDER.reduce<Record<string, Product[]>>((acc, type) => {
    acc[type] = products.filter(p => p.product_type === type);
    return acc;
  }, {});

  // Get cheapest price for each product type
  const startingPrices = Object.entries(productsByType).reduce<Record<string, number>>((acc, [type, prods]) => {
    if (prods.length > 0) {
      acc[type] = Math.min(...prods.map(p => p.price_cents));
    }
    return acc;
  }, {});

  const handleSelectType = useCallback((type: string) => {
    setSelectedType(type);
    const typeProducts = productsByType[type];
    if (typeProducts?.length > 0) {
      setSelectedProduct(typeProducts[0]);
    }
    const startPrice = startingPrices[type];
    if (startPrice) trackSelectProduct(type, startPrice);
  }, [productsByType, startingPrices]);

  const handleSelectSize = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;

    const options: Record<string, string> = {};
    let variantId = selectedProduct.printful_variant_id;

    // Resolve correct Printful variant ID for framed posters by frame color
    if (selectedProduct.product_type === 'framed_poster') {
      options.frameColor = frameColor;
      const variantMap = selectedProduct.options?.variant_ids_by_color as Record<string, number> | undefined;
      if (variantMap && variantMap[frameColor]) {
        variantId = variantMap[frameColor];
      }
    }

    addItem({
      imageUrl,
      generationId,
      imageIndex,
      productType: selectedProduct.product_type,
      productId: selectedProduct.id,
      sizeLabel: selectedProduct.size_label,
      displayName: selectedProduct.display_name,
      variantId,
      priceCents: selectedProduct.price_cents,
      options,
      mockupUrl: mockupUrl || undefined,
    });

    trackAddToCart(selectedProduct.product_type, selectedProduct.price_cents);
    window.location.href = '/print/checkout';
  }, [selectedProduct, frameColor, imageUrl, generationId, imageIndex, addItem, mockupUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    );
  }

  // Render the large mockup preview
  const renderLargeMockup = () => {
    if (!selectedType || !selectedProduct) {
      return (
        <div className="bg-white/5 rounded-xl p-2">
          <img src={imageUrl} alt="Your portrait" className="w-full aspect-square object-cover rounded-lg" />
        </div>
      );
    }

    return (
      <div className="relative">
        {/* CSS mockup — fades out when Printful mockup loads */}
        <div className={`transition-opacity duration-700 ${mockupUrl ? 'opacity-0' : 'opacity-100'}`}>
          {selectedType === 'canvas' && <LargeCanvasMockup imageUrl={imageUrl} />}
          {selectedType === 'framed_poster' && <LargeFramedMockup imageUrl={imageUrl} frameColor={frameColor} />}
          {selectedType === 'poster' && <LargePosterMockup imageUrl={imageUrl} />}
          {selectedType === 'mug' && <LargeMugMockup imageUrl={imageUrl} />}
        </div>

        {/* Printful mockup — fades in when loaded */}
        {mockupUrl && (
          <div className="absolute inset-0 transition-opacity duration-700 opacity-100">
            <img
              src={mockupUrl}
              alt="Product mockup"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        )}

        {/* Loading indicator */}
        {mockupLoading && !mockupUrl && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <div className="w-3 h-3 rounded-full border border-white/30 border-t-white/70 animate-spin" />
            <span className="text-[10px] text-white/50">Loading preview</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {selectedType && (
              <button
                onClick={() => { setSelectedType(null); setSelectedProduct(null); }}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg md:text-xl font-semibold">
              {selectedType ? `${PRODUCT_TYPE_INFO[selectedType]?.label}` : 'Choose Your Product'}
            </h1>
          </div>
          <a href="/print/checkout" className="text-sm text-white/60 hover:text-white transition-colors">
            Checkout →
          </a>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Left: Mockup preview */}
          <div className="flex items-start justify-center">
            <div className="w-full max-w-sm">
              {renderLargeMockup()}
            </div>
          </div>

          {/* Right: Product selection */}
          <div>
            {/* Product type cards with mini mockups */}
            {!selectedType && (
              <div className="grid grid-cols-2 gap-3">
                {PRODUCT_TYPE_ORDER.filter(type => productsByType[type]?.length > 0).map(type => {
                  const info = PRODUCT_TYPE_INFO[type];
                  const startPrice = startingPrices[type];
                  const MiniMockup = MINI_MOCKUPS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleSelectType(type)}
                      className="p-4 pt-5 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all text-center"
                    >
                      {MiniMockup && <MiniMockup imageUrl={imageUrl} />}
                      <div className="text-sm font-semibold mb-0.5">{info.label}</div>
                      <div className="text-[11px] text-white/40 mb-2">{info.description}</div>
                      <div className="text-sm font-medium text-white/80">
                        From ${(startPrice / 100).toFixed(2)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Size selector (when type is selected) */}
            {selectedType && (
              <div>
                <h2 className="text-base font-semibold text-white/60 mb-3">
                  Select Size
                </h2>

                <div className="space-y-2 mb-6">
                  {productsByType[selectedType]?.map(product => {
                    const quality = getQualityLabel(product);
                    const isSelected = selectedProduct?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleSelectSize(product)}
                        className={`w-full p-3.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-white bg-white/10'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Radio indicator */}
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-white' : 'border-white/30'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <span className="font-medium">{product.size_label}</span>
                            {quality && (
                              <span className={`text-xs ml-2 ${quality.color}`}>{quality.label}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-white/80 font-medium">${(product.price_cents / 100).toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Frame color selector (framed poster only) */}
                {selectedType === 'framed_poster' && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-white/60 mb-2">Frame Color</h3>
                    <div className="flex gap-3">
                      {(['black', 'white', 'natural'] as const).map(color => (
                        <button
                          key={color}
                          onClick={() => setFrameColor(color)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            frameColor === color
                              ? 'border-white bg-white/10'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full ${
                            color === 'black' ? 'bg-gray-900 border border-white/20' :
                            color === 'white' ? 'bg-white' :
                            'bg-amber-200'
                          }`} />
                          <span className="text-sm capitalize">{color === 'natural' ? 'Wood' : color}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price + Checkout — desktop only (mobile uses sticky bar) */}
                {selectedProduct && (
                  <div className="hidden md:block mt-8">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-white/50 text-sm">Total</span>
                      <div>
                        <span className="text-3xl font-bold">${(selectedProduct.price_cents / 100).toFixed(2)}</span>
                        <span className="text-white/40 text-xs ml-1.5">+ shipping</span>
                      </div>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      className="w-full py-4 rounded-xl bg-white text-black font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Checkout — ${(selectedProduct.price_cents / 100).toFixed(2)}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Trust / shipping info */}
        <div className="mt-8 md:mt-10 text-center text-xs text-white/30 space-y-1 pb-24 md:pb-0">
          <p>Ships directly to you from our US print facility</p>
          <p>Premium quality printing &middot; Satisfaction guaranteed</p>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      {selectedType && selectedProduct && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-lg border-t border-white/10 p-4 z-50"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleAddToCart}
            className="w-full py-4 rounded-xl bg-white text-black font-semibold text-base active:scale-[0.98] transition-all cursor-pointer"
          >
            Checkout — ${(selectedProduct.price_cents / 100).toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}
