'use client';

import { useState, useEffect } from 'react';
import ImageGallery from './ImageGallery';

interface GalleryImage {
  url: string;
  alt: string;
}

export default function HeroGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => {
        if (data.images?.length > 0) {
          setImages(data.images);
        }
      })
      .catch(() => {});
  }, []);

  if (images.length === 0) return null;

  const openGallery = (index: number) => {
    setSelectedIndex(index);
    setIsGalleryOpen(true);
  };

  return (
    <>
      {/* Mobile: Horizontal scroll carousel */}
      <div className="md:hidden">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => openGallery(index)}
              className="flex-shrink-0 snap-center w-[72vw] aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border-2 border-white/80 active:scale-[0.98] transition-transform"
            >
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-1">Swipe to see more</p>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {images.slice(0, 6).map((image, index) => (
          <button
            key={index}
            onClick={() => openGallery(index)}
            className="aspect-[3/4] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl border-2 border-white/80 hover:border-coral-300 transition-all transform hover:scale-[1.03]"
          >
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </button>
        ))}
      </div>

      {/* Full-screen gallery viewer */}
      <ImageGallery
        images={images.map(img => img.url)}
        initialIndex={selectedIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        downloadPrefix="petpics-example"
      />
    </>
  );
}
