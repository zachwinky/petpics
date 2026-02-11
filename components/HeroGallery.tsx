'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ImageGallery from './ImageGallery';

interface GalleryImage {
  url: string;
  alt: string;
}

export default function HeroGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracted = useRef(false);

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

  // Auto-scroll on mobile
  const startAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el || userInteracted.current) return;

      const cardWidth = el.offsetWidth * 0.72 + 12; // 72vw + gap
      const maxScroll = el.scrollWidth - el.offsetWidth;
      const nextScroll = el.scrollLeft + cardWidth;

      if (nextScroll >= maxScroll - 10) {
        // Loop back to start
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollTo({ left: nextScroll, behavior: 'smooth' });
      }
    }, 3000);
  }, []);

  useEffect(() => {
    if (images.length > 1) {
      startAutoScroll();
    }
    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [images, startAutoScroll]);

  // Pause auto-scroll on user interaction, resume after 6s
  const handleUserInteraction = useCallback(() => {
    userInteracted.current = true;
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);

    setTimeout(() => {
      userInteracted.current = false;
      startAutoScroll();
    }, 6000);
  }, [startAutoScroll]);

  if (images.length === 0) return null;

  const openGallery = (index: number) => {
    setSelectedIndex(index);
    setIsGalleryOpen(true);
  };

  return (
    <>
      {/* Mobile: Auto-scrolling carousel */}
      <div className="md:hidden">
        <div
          ref={scrollRef}
          onTouchStart={handleUserInteraction}
          onScroll={handleUserInteraction}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide"
        >
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
