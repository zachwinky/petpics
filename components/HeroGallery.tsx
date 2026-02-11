'use client';

import { useState, useEffect, useRef } from 'react';
import ImageGallery from './ImageGallery';

interface GalleryImage {
  url: string;
  alt: string;
}

export default function HeroGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

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
    // Map duplicated index back to real index
    setSelectedIndex(index % images.length);
    setIsGalleryOpen(true);
  };

  // Duplicate images for seamless loop
  const loopImages = [...images, ...images];
  // Duration: ~8s per image for a slow drift
  const duration = images.length * 8;

  return (
    <>
      {/* Mobile: Continuous slow-scrolling carousel */}
      <div
        className="md:hidden overflow-hidden -mx-4"
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          className="flex gap-3 px-4"
          style={{
            animation: `hero-scroll ${duration}s linear infinite`,
            animationPlayState: paused ? 'paused' : 'running',
            width: 'max-content',
          }}
        >
          {loopImages.map((image, index) => (
            <button
              key={index}
              onClick={() => openGallery(index)}
              className="flex-shrink-0 w-[65vw] aspect-[3/4] rounded-2xl overflow-hidden shadow-xl border-2 border-white/80 active:scale-[0.98] transition-transform"
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
