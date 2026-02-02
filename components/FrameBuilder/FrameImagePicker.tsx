'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Model {
  id: number;
  name: string;
  trigger_word: string;
  preview_image_url?: string;
}

interface Generation {
  id: number;
  model_id: number | null;
  image_urls: string[];
  created_at: string;
}

interface ImageWithMeta {
  url: string;
  generationId: number;
  modelId: number | null;
  modelName: string;
}

interface FrameImagePickerProps {
  selectedImages: (string | null)[];
  onImageSelect: (url: string, slotIndex?: number) => void;
  onImageRemove: (url: string) => void;
  maxImages?: number;
}

export default function FrameImagePicker({
  selectedImages,
  onImageSelect,
  onImageRemove,
  maxImages = 4,
}: FrameImagePickerProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [allImages, setAllImages] = useState<ImageWithMeta[]>([]);

  // Fetch models and generations
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch models
        const modelsRes = await fetch('/api/models');
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          setModels(modelsData.models || []);
        }

        // Fetch all generations
        const gensRes = await fetch('/api/generations');
        if (gensRes.ok) {
          const gensData = await gensRes.json();
          setGenerations(gensData.generations || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Build flat list of all images with metadata
  useEffect(() => {
    const images: ImageWithMeta[] = [];

    for (const gen of generations) {
      const model = models.find(m => m.id === gen.model_id);
      const modelName = model?.name || model?.trigger_word || 'Unknown Pet';

      for (const url of gen.image_urls) {
        images.push({
          url,
          generationId: gen.id,
          modelId: gen.model_id,
          modelName,
        });
      }
    }

    setAllImages(images);
  }, [generations, models]);

  // Filter images by selected model
  const filteredImages = selectedModelId === 'all'
    ? allImages
    : allImages.filter(img => img.modelId === selectedModelId);

  const selectedCount = selectedImages.filter(Boolean).length;
  const canSelectMore = selectedCount < maxImages;

  const isSelected = (url: string) => selectedImages.includes(url);

  const handleImageClick = (url: string) => {
    if (isSelected(url)) {
      onImageRemove(url);
    } else if (canSelectMore) {
      onImageSelect(url);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-coral-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-gray-500">Loading your images...</span>
      </div>
    );
  }

  if (allImages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No images found. Generate some photos first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pet filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600">Filter by pet:</span>
        <button
          onClick={() => setSelectedModelId('all')}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
            selectedModelId === 'all'
              ? 'bg-coral-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Pets
        </button>
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModelId(model.id)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedModelId === model.id
                ? 'bg-coral-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {model.name || model.trigger_word}
          </button>
        ))}
      </div>

      {/* Selection count */}
      <div className="text-sm text-gray-600">
        {selectedCount} of {maxImages} images selected
        {!canSelectMore && <span className="text-coral-500 ml-2">(Maximum reached)</span>}
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
        {filteredImages.map((img, index) => {
          const selected = isSelected(img.url);
          const selectionIndex = selectedImages.indexOf(img.url);

          return (
            <button
              key={`${img.generationId}-${index}`}
              onClick={() => handleImageClick(img.url)}
              disabled={!selected && !canSelectMore}
              className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                selected
                  ? 'ring-2 ring-coral-500 ring-offset-2'
                  : canSelectMore
                    ? 'hover:ring-2 hover:ring-coral-300 hover:ring-offset-1'
                    : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <Image
                src={img.url}
                alt={img.modelName}
                fill
                sizes="80px"
                className="object-cover"
              />
              {selected && (
                <div className="absolute inset-0 bg-coral-500/20 flex items-center justify-center">
                  <div className="w-6 h-6 bg-coral-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {selectionIndex + 1}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filteredImages.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No images found for this pet.
        </div>
      )}
    </div>
  );
}
