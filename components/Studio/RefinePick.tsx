'use client';

import { useState } from 'react';

interface RefinePickProps {
  originalImageUrl: string;
  variationUrls: string[];
  isLoading: boolean;
  onPick: (imageUrl: string, isOriginal: boolean) => void;
  onReject: () => void;
}

export default function RefinePick({ originalImageUrl, variationUrls, isLoading, onPick, onReject }: RefinePickProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Build full grid: original at index 0, then up to 3 variations
  const allImages = [originalImageUrl, ...variationUrls];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-4 px-4">
        <p className="text-white/60 text-sm">Pick the best version</p>
      </div>

      {/* 2×2 grid */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="grid grid-cols-2 gap-1 md:gap-2 w-full max-w-lg">
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
      </div>

      {/* Actions */}
      <div className="p-4 pb-8 flex flex-col items-center gap-3">
        {selectedIndex !== null && !isLoading && (
          <button
            onClick={() => onPick(allImages[selectedIndex], selectedIndex === 0)}
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
