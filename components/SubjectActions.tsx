'use client';

import { useState, useCallback } from 'react';
import StudioOverlay, { StudioModel, StudioPortraitResult } from './Studio/StudioOverlay';
import { trackStudioOpened } from '@/components/MetaPixelEvents';

interface SubjectActionsProps {
  model: StudioModel;
  hasExistingPortraits: boolean;
}

export default function SubjectActions({ model, hasExistingPortraits }: SubjectActionsProps) {
  const [showChoice, setShowChoice] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);

  const handleOrderClick = useCallback(() => {
    if (hasExistingPortraits) {
      setShowChoice(true);
    } else {
      setStudioOpen(true);
      trackStudioOpened();
    }
  }, [hasExistingPortraits]);

  const handleCreateNew = useCallback(() => {
    setShowChoice(false);
    setStudioOpen(true);
    trackStudioOpened();
  }, []);

  const handleChooseExisting = useCallback(() => {
    setShowChoice(false);
    const section = document.getElementById('portraits-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handlePortraitSelected = useCallback(async (portrait: StudioPortraitResult) => {
    try {
      await fetch('/api/studio/save-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.id,
          generationId: portrait.generationId,
          imageIndex: portrait.imageIndex,
          imageUrl: portrait.imageUrl,
          sceneId: portrait.sceneId,
        }),
      });
    } catch (err) {
      console.error('Failed to save portrait:', err);
    }

    setStudioOpen(false);
    let configureUrl = `/print/configure?image=${encodeURIComponent(portrait.imageUrl)}&generationId=${portrait.generationId}&imageIndex=${portrait.imageIndex}&productType=${encodeURIComponent(portrait.productType)}`;
    if (portrait.mockupUrl) {
      configureUrl += `&mockupUrl=${encodeURIComponent(portrait.mockupUrl)}`;
    }
    window.location.href = configureUrl;
  }, [model.id]);

  return (
    <>
      <button
        onClick={handleOrderClick}
        className="px-6 py-3 bg-coral-500 text-white font-medium rounded-lg hover:bg-coral-600 transition-colors text-center"
      >
        Order a Print
      </button>

      {/* Choice modal */}
      {showChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowChoice(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 text-center">Order a Print</h3>
            <p className="text-sm text-gray-600 text-center">
              Create a fresh portrait or pick one you already have.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleCreateNew}
                className="w-full py-3 bg-coral-500 text-white font-semibold rounded-xl hover:bg-coral-600 transition-colors"
              >
                Create New Portrait
              </button>
              <button
                onClick={handleChooseExisting}
                className="w-full py-3 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Choose from Portraits Below
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Studio overlay */}
      {studioOpen && (
        <StudioOverlay
          model={model}
          onClose={() => setStudioOpen(false)}
          onPortraitSelected={handlePortraitSelected}
        />
      )}
    </>
  );
}
