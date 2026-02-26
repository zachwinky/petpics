'use client';

import { useState, useEffect } from 'react';
import { LargeMockupForType, PRINTFUL_PRODUCT_IDS } from '@/components/PrintShop/LargeMockups';

interface RefinePickProps {
  originalImageUrl: string;
  variationUrls: string[];
  isLoading: boolean;
  productType: string;
  onPick: (imageUrl: string, isOriginal: boolean, mockupUrl?: string) => void;
  onReject: () => void;
}

function useMockupPreview(imageUrl: string | null, productType: string) {
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setMockupUrl(null);
      return;
    }

    const printfulProductId = PRINTFUL_PRODUCT_IDS[productType];
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
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.mockupUrl) {
          setMockupUrl(data.mockupUrl);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [imageUrl, productType]);

  return { mockupUrl, loading };
}

export default function RefinePick({ originalImageUrl, variationUrls, isLoading, productType, onPick, onReject }: RefinePickProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Build full grid: original at index 0, then up to 3 variations
  const allImages = [originalImageUrl, ...variationUrls];
  const selectedImageUrl = selectedIndex !== null ? allImages[selectedIndex] : null;

  const { mockupUrl, loading: mockupLoading } = useMockupPreview(selectedImageUrl, productType);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-4 px-4">
        <p className="text-white/60 text-sm">Pick the best version</p>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        <div className={`w-full max-w-lg ${selectedIndex !== null ? 'flex gap-3 items-start' : ''}`}>
          {/* Image grid - shrinks to half when mockup visible */}
          <div className={`grid grid-cols-2 gap-1 md:gap-2 ${selectedIndex !== null ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
            {[0, 1, 2, 3].map(index => {
              const imageUrl = allImages[index];
              const hasImage = !!imageUrl;
              const isSelected = selectedIndex === index;
              const isDimmed = selectedIndex !== null && !isSelected;

              return (
                <div
                  key={index}
                  className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-300 ${
                    isSelected ? 'ring-2 ring-white' : ''
                  } ${isDimmed ? 'opacity-50' : ''}`}
                >
                  {hasImage ? (
                    <button
                      onClick={() => setSelectedIndex(index)}
                      className="w-full h-full"
                    >
                      <img
                        src={imageUrl}
                        alt={index === 0 ? 'Original' : `Variation ${index}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    /* Skeleton shimmer for loading variations */
                    <div className="w-full h-full bg-white/5 animate-pulse">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mockup preview - slides in when an image is selected */}
          {selectedIndex !== null && (
            <div className="w-1/2 transition-all duration-300">
              <div className="relative rounded-xl overflow-hidden">
                {/* CSS mockup fallback */}
                <div className={`transition-opacity duration-700 ${mockupUrl ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="scale-[0.7] origin-top">
                    <LargeMockupForType productType={productType} imageUrl={allImages[selectedIndex]} />
                  </div>
                </div>

                {/* Printful mockup - fades in */}
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
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                    <div className="w-3 h-3 rounded-full border border-white/30 border-t-white/70 animate-spin" />
                    <span className="text-[10px] text-white/50">Loading preview</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pb-8 flex flex-col items-center gap-3">
        {selectedIndex !== null && !isLoading && (
          <button
            onClick={() => onPick(allImages[selectedIndex], selectedIndex === 0, mockupUrl || undefined)}
            className="w-full max-w-lg py-4 rounded-xl bg-white text-black font-semibold text-base transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            Print This Portrait →
          </button>
        )}
        <button
          onClick={onReject}
          className="text-white/40 text-sm hover:text-white/60 transition-colors"
        >
          None of these — try different scenes
        </button>
      </div>
    </div>
  );
}
