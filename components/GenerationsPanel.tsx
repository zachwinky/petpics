'use client';

import { useState } from 'react';
import GenerationImage from './GenerationImage';
import RowActions from './RowActions';
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

// Split array into chunks of specified size
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default function GenerationsPanel({ generations: initialGenerations, model, onAddToFrame }: GenerationsPanelProps) {
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const handleImageClick = (allImages: string[], clickedIndex: number) => {
    setGalleryImages(allImages);
    setGalleryInitialIndex(clickedIndex);
    setGalleryOpen(true);
  };

  const handleRowImagesUpdated = (generationId: number, rowIndex: number, newUrls: string[]) => {
    setGenerations(prev =>
      prev.map(gen => {
        if (gen.id !== generationId) return gen;

        // Replace the specific row (4 images starting at rowIndex * 4)
        const updatedUrls = [...gen.image_urls];
        const startIdx = rowIndex * 4;
        for (let i = 0; i < newUrls.length && startIdx + i < updatedUrls.length; i++) {
          updatedUrls[startIdx + i] = newUrls[i];
        }

        return { ...gen, image_urls: updatedUrls, reroll_used: true };
      })
    );
  };

  if (generations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📸</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No product images yet</h3>
        <p className="text-gray-600 mb-6">
          Generate your first product images for this photo subject
        </p>
        <Link
          href={`/generate?modelId=${model.id}`}
          className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Generate Photos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {generations.map((generation) => {
        // Split images into rows of 4
        const imageRows = chunkArray(generation.image_urls, 4);

        return (
          <div
            key={generation.id}
            className="border border-gray-200 rounded-lg p-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">
                {new Date(generation.created_at).toLocaleDateString()} at{' '}
                {new Date(generation.created_at).toLocaleTimeString()}
              </div>
              <div className="text-sm font-medium text-indigo-600">
                {generation.credits_used} credits
              </div>
            </div>

            {/* Image rows with action buttons */}
            <div className="space-y-6 md:space-y-4">
              {imageRows.map((rowImages, rowIndex) => (
                <div key={rowIndex}>
                  <div className="flex items-center gap-3">
                    {/* 4 images in a row */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {rowImages.map((url, imgIdx) => {
                        // Get the quality score for this specific image
                        const globalIndex = rowIndex * 4 + imgIdx;
                        const qualityScore = generation.image_quality_scores?.[globalIndex];

                        return (
                          <GenerationImage
                            key={`${generation.id}-${rowIndex}-${imgIdx}`}
                            url={url}
                            alt={`Generated ${globalIndex + 1}`}
                            downloadFilename={`${model.trigger_word}-${generation.id}-${globalIndex + 1}.png`}
                            qualityScore={qualityScore}
                            petName={model.trigger_word}
                            onImageClick={() => handleImageClick(generation.image_urls, globalIndex)}
                            onAddToFrame={onAddToFrame}
                          />
                        );
                      })}
                    </div>

                    {/* Action buttons for this row - only show on md+ screens inline */}
                    <div className="hidden md:flex flex-col gap-2 min-w-[130px]">
                      <RowActions
                        generation={generation}
                        rowIndex={rowIndex}
                        modelId={model.id}
                        loraUrl={model.lora_url}
                        triggerWord={model.trigger_word}
                        onRowImagesUpdated={handleRowImagesUpdated}
                      />
                    </div>
                  </div>

                  {/* Mobile: Show compact actions below EACH row */}
                  <div className="md:hidden mt-3 flex justify-center">
                    <RowActions
                      generation={generation}
                      rowIndex={rowIndex}
                      modelId={model.id}
                      loraUrl={model.lora_url}
                      triggerWord={model.trigger_word}
                      onRowImagesUpdated={handleRowImagesUpdated}
                      isMobile={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Mobile Image Gallery */}
      <ImageGallery
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        downloadPrefix={model.trigger_word}
        petName={model.trigger_word}
      />
    </div>
  );
}
