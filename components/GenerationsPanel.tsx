'use client';

import { useState } from 'react';
import ImageGallery from './ImageGallery';
import Link from 'next/link';

interface Generation {
  id: number;
  image_urls: string[];
  custom_prompt: string | null;
  preset_prompt_id: string | null;
  row_prompts?: string[];
  image_quality_scores?: number[];
  credits_used: number;
  created_at: string;
  reroll_used?: boolean;
  upscale_used?: boolean;
  aspect_ratio?: string;
}

interface Model {
  id: number;
  trigger_word: string;
  lora_url: string;
}

interface GenerationsPanelProps {
  generations: Generation[];
  model: Model;
  onAddToFrame?: (imageUrl: string) => void;
}

export default function GenerationsPanel({ generations, model }: GenerationsPanelProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Flatten all images into one list
  const allImages = generations.flatMap(gen => gen.image_urls);

  if (allImages.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No portraits yet</h3>
        <p className="text-gray-600 mb-6">
          Tap &ldquo;Order a Print&rdquo; above to create your first portrait.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-coral-500 text-white font-medium rounded-lg hover:bg-coral-600 transition-colors"
        >
          Order a Print
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {allImages.map((url, idx) => (
          <div key={idx} className="relative group">
            <img
              src={url}
              alt={`Portrait ${idx + 1}`}
              className="w-full aspect-square object-cover rounded-lg cursor-pointer"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setGalleryInitialIndex(idx);
                  setGalleryOpen(true);
                }
              }}
            />
            {/* Print overlay on hover (desktop) / always visible (mobile) */}
            <a
              href={`/print/configure?image=${encodeURIComponent(url)}`}
              className="absolute bottom-2 right-2 px-3 py-1.5 bg-coral-500 text-white text-xs font-semibold rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-md"
            >
              Print
            </a>
          </div>
        ))}
      </div>

      {/* Mobile Image Gallery */}
      <ImageGallery
        images={allImages}
        initialIndex={galleryInitialIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        downloadPrefix={model.trigger_word}
        petName={model.trigger_word}
      />
    </div>
  );
}
