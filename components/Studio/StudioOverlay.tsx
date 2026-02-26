'use client';

import { useState, useCallback, useEffect } from 'react';
import ProductPicker from './ProductPicker';
import ScenePicker from './ScenePicker';
import FavoritePick from './FavoritePick';
import RefinePick from './RefinePick';
import StudioLoading from './StudioLoading';
import { trackScenesSelected, trackPortraitSelected, trackRound1Reject, trackRound2Reject } from '@/components/MetaPixelEvents';

export interface StudioModel {
  id: number;
  name: string;
  lora_url: string;
  trigger_word: string;
  pet_type: string;
  preview_image_url?: string;
}

export interface StudioPortraitResult {
  imageUrl: string;
  generationId: number;
  imageIndex: number;
  sceneId: string;
  productType: string;
}

interface StudioOverlayProps {
  model: StudioModel;
  onClose: () => void;
  onPortraitSelected: (portrait: StudioPortraitResult) => void;
  initialProductType?: string;
}

type StudioStep = 'product' | 'scenes' | 'loading' | 'pick' | 'refine-loading' | 'refine';

export default function StudioOverlay({ model, onClose, onPortraitSelected, initialProductType }: StudioOverlayProps) {
  const [step, setStep] = useState<StudioStep>(initialProductType ? 'scenes' : 'product');
  const [error, setError] = useState<string | null>(null);

  // Product selection
  const [selectedProductType, setSelectedProductType] = useState<string | null>(initialProductType || null);

  // Step 1 → 2 data
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [sceneIds, setSceneIds] = useState<string[]>([]);

  // Step 2 → 3 data
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [variationUrls, setVariationUrls] = useState<string[]>([]);
  const [variationGenerationId, setVariationGenerationId] = useState<number | null>(null);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Step 1: Generate portraits from selected scenes
  const handleScenesSelected = useCallback(async (selectedSceneIds: string[]) => {
    setSceneIds(selectedSceneIds);
    setStep('loading');
    setError(null);
    trackScenesSelected(selectedSceneIds.length);

    try {
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.id,
          sceneIds: selectedSceneIds,
          productType: selectedProductType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await response.json();
      setGeneratedImages(data.imageUrls);
      setGenerationId(data.generationId);
      setStep('pick');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('scenes');
    }
  }, [model.id, selectedProductType]);

  // Step 2: Pick favorite → generate variations
  const handleFavoritePicked = useCallback(async (imageUrl: string, index: number, sceneId: string) => {
    setSelectedImage(imageUrl);
    setSelectedSceneId(sceneId);
    setSelectedImageIndex(index);
    setVariationUrls([]);
    setStep('refine-loading');
    setError(null);

    try {
      const response = await fetch('/api/studio/variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.id,
          sceneId,
          originalGenerationId: generationId,
          productType: selectedProductType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Variation generation failed');
      }

      const data = await response.json();
      setVariationUrls(data.imageUrls);
      setVariationGenerationId(data.generationId);
      setStep('refine');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      // Still show refine step with just the original
      setStep('refine');
    }
  }, [model.id, generationId, selectedProductType]);

  // Step 3: Final pick → pass to print flow
  const handleRefinePick = useCallback((imageUrl: string, isOriginal: boolean) => {
    const finalGenerationId = isOriginal ? generationId! : variationGenerationId!;
    const finalIndex = isOriginal ? selectedImageIndex : variationUrls.indexOf(imageUrl);
    trackPortraitSelected();

    onPortraitSelected({
      imageUrl,
      generationId: finalGenerationId,
      imageIndex: isOriginal ? selectedImageIndex : finalIndex + 1, // +1 because original is at 0 in the variation generation... actually we stored variations separately
      sceneId: selectedSceneId!,
      productType: selectedProductType!,
    });
  }, [generationId, variationGenerationId, selectedImageIndex, selectedSceneId, selectedProductType, variationUrls, onPortraitSelected]);

  // Reset to scene picker
  const handleReject = useCallback(() => {
    // Track which round the rejection came from
    if (step === 'pick') {
      trackRound1Reject();
    } else if (step === 'refine' || step === 'refine-loading') {
      trackRound2Reject();
    }

    setStep('scenes');
    setGeneratedImages([]);
    setGenerationId(null);
    setSceneIds([]);
    setSelectedImage(null);
    setSelectedSceneId(null);
    setVariationUrls([]);
    setError(null);
  }, [step]);

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Error display */}
      {error && (
        <div className="absolute top-4 left-4 right-16 z-10 bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-2">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="h-full pt-16 pb-4 overflow-hidden">
        {step === 'product' && (
          <ProductPicker
            petName={model.trigger_word}
            previewImageUrl={model.preview_image_url}
            onProductSelected={(productType) => {
              setSelectedProductType(productType);
              setStep('scenes');
            }}
          />
        )}

        {step === 'scenes' && (
          <ScenePicker
            petName={model.trigger_word}
            onScenesSelected={handleScenesSelected}
          />
        )}

        {step === 'loading' && (
          <StudioLoading
            petName={model.trigger_word}
            previewImageUrl={model.preview_image_url}
          />
        )}

        {step === 'pick' && (
          <FavoritePick
            imageUrls={generatedImages}
            sceneIds={sceneIds}
            onPick={handleFavoritePicked}
            onReject={handleReject}
          />
        )}

        {(step === 'refine-loading' || step === 'refine') && selectedImage && (
          <RefinePick
            originalImageUrl={selectedImage}
            variationUrls={variationUrls}
            isLoading={step === 'refine-loading'}
            onPick={handleRefinePick}
            onReject={handleReject}
          />
        )}
      </div>
    </div>
  );
}
