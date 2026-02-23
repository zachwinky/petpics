'use client';

import { useState } from 'react';

interface FavoritePickProps {
  imageUrls: string[];
  sceneIds: string[];
  onPick: (imageUrl: string, index: number, sceneId: string) => void;
  onReject: () => void;
}

export default function FavoritePick({ imageUrls, sceneIds, onPick, onReject }: FavoritePickProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-4 px-4">
        <p className="text-white/60 text-sm">Tap your favorite</p>
      </div>

      {/* 2×2 grid */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="grid grid-cols-2 gap-1 md:gap-2 w-full max-w-lg">
          {imageUrls.map((url, index) => {
            const isSelected = selectedIndex === index;
            const isDimmed = selectedIndex !== null && !isSelected;
            return (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`relative aspect-square rounded-lg overflow-hidden transition-all duration-300 ${
                  isSelected ? 'ring-2 ring-white' : ''
                } ${isDimmed ? 'opacity-50' : ''}`}
              >
                <img
                  src={url}
                  alt={`Portrait ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pb-8 flex flex-col items-center gap-3">
        {selectedIndex !== null && (
          <button
            onClick={() => onPick(imageUrls[selectedIndex], selectedIndex, sceneIds[selectedIndex])}
            className="w-full max-w-lg py-4 rounded-xl bg-white text-black font-semibold text-base transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            Use This One →
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
