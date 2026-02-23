'use client';

import { useState, useEffect } from 'react';

const SAMPLE_PRINTS = [
  { caption: 'Bella — Canvas 16×20"', product: 'Canvas Print' },
  { caption: 'Milo — Framed Poster 18×24"', product: 'Framed Poster' },
  { caption: 'Cooper — Matte Print 12×18"', product: 'Matte Poster' },
];

export default function SocialProof() {
  const [images, setImages] = useState<{ url: string; alt: string }[]>([]);

  useEffect(() => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => {
        if (data.images?.length >= 3) {
          setImages(data.images.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  if (images.length < 3) return null;

  return (
    <div>
      <h3 className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Sample prints
      </h3>
      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-5">
        {images.map((img, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md border border-coral-50 overflow-hidden">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
            </div>
            <div className="p-3 text-center">
              <p className="text-sm font-medium text-gray-900">{SAMPLE_PRINTS[i].caption}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {images.map((img, i) => (
          <div key={i} className="flex-shrink-0 w-[70vw] snap-center bg-white rounded-xl shadow-md border border-coral-50 overflow-hidden">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
            </div>
            <div className="p-3 text-center">
              <p className="text-sm font-medium text-gray-900">{SAMPLE_PRINTS[i].caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
