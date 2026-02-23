'use client';

import { useState, useCallback } from 'react';
import StudioOverlay, { StudioModel, StudioPortraitResult } from './StudioOverlay';
import { trackStudioOpened } from '@/components/MetaPixelEvents';

interface DashboardStudioWrapperProps {
  models: StudioModel[];
  children: React.ReactNode;
}

export default function DashboardStudioWrapper({ models, children }: DashboardStudioWrapperProps) {
  const [studioOpen, setStudioOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<StudioModel | null>(null);

  const openStudio = useCallback((model: StudioModel) => {
    setSelectedModel(model);
    setStudioOpen(true);
    trackStudioOpened();
  }, []);

  const closeStudio = useCallback(() => {
    setStudioOpen(false);
    setSelectedModel(null);
  }, []);

  const handlePortraitSelected = useCallback(async (portrait: StudioPortraitResult) => {
    // Save the portrait to the database
    try {
      await fetch('/api/studio/save-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel?.id,
          generationId: portrait.generationId,
          imageIndex: portrait.imageIndex,
          imageUrl: portrait.imageUrl,
          sceneId: portrait.sceneId,
        }),
      });
    } catch (err) {
      console.error('Failed to save portrait:', err);
    }

    // Close studio and redirect to product selection
    closeStudio();
    // Navigate to print product selector with the selected portrait
    window.location.href = `/print/configure?image=${encodeURIComponent(portrait.imageUrl)}&generationId=${portrait.generationId}&imageIndex=${portrait.imageIndex}`;
  }, [selectedModel, closeStudio]);

  return (
    <>
      {/* Pass openStudio function to children via data attribute on a hidden element */}
      <div data-studio-wrapper>
        {children}

        {/* Studio launch buttons rendered for each model */}
        {models.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-coral-100 p-4 md:p-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">Portrait Studio</h2>
            <p className="text-sm text-gray-600 mb-4">
              Create stunning portraits and order prints delivered to your door.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => openStudio(model)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-coral-100 hover:border-coral-300 hover:bg-coral-50 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-coral-100 flex-shrink-0">
                    {model.preview_image_url ? (
                      <img src={model.preview_image_url} alt={model.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🐾</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{model.name}</div>
                    <div className="text-sm text-coral-600">Create New Portraits →</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Studio overlay */}
      {studioOpen && selectedModel && (
        <StudioOverlay
          model={selectedModel}
          onClose={closeStudio}
          onPortraitSelected={handlePortraitSelected}
        />
      )}
    </>
  );
}
