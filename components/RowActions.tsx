'use client';

import { useState } from 'react';

interface Generation {
  id: number;
  image_urls: string[];
  custom_prompt: string | null;
  preset_prompt_id: string | null;
  row_prompts?: string[];
  credits_used: number;
  created_at: string;
  reroll_used?: boolean;
  upscale_used?: boolean;
}

interface RowActionsProps {
  generation: Generation;
  rowIndex: number;
  modelId: number;
  loraUrl: string;
  triggerWord: string;
  onRowImagesUpdated: (generationId: number, rowIndex: number, newUrls: string[]) => void;
  isMobile?: boolean;
}

export default function RowActions({
  generation,
  rowIndex,
  modelId,
  loraUrl,
  triggerWord,
  onRowImagesUpdated,
  isMobile = false,
}: RowActionsProps) {
  const [showGenerateMore, setShowGenerateMore] = useState(false);
  const [showRemakeConfirm, setShowRemakeConfirm] = useState(false);
  const [isRemaking, setIsRemaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [remakeUsed, setRemakeUsed] = useState(generation.reroll_used || false);
  const [upscaleUsed, setUpscaleUsed] = useState(generation.upscale_used || false);
  const [error, setError] = useState('');

  // Can remake any row, but only one free remake per batch total, and not after upscaling
  const canRemake = !remakeUsed && !upscaleUsed;
  // Can upscale for free once per batch
  const canFreeUpscale = !upscaleUsed;

  // Get the prompt for this specific row
  const getRowPrompt = () => {
    if (generation.row_prompts && generation.row_prompts[rowIndex]) {
      return generation.row_prompts[rowIndex];
    }
    // Fall back to custom_prompt or first preset
    return generation.custom_prompt || null;
  };

  const handleRemake = async () => {
    if (!canRemake) return;

    setIsRemaking(true);
    setError('');
    setShowRemakeConfirm(false);

    try {
      const response = await fetch('/api/reroll-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: generation.id,
          modelId,
          loraUrl,
          triggerWord,
          rowIndex,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remake');
      }

      if (data.success && data.imageUrls) {
        onRowImagesUpdated(generation.id, rowIndex, data.imageUrls);
        setRemakeUsed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remake');
    } finally {
      setIsRemaking(false);
    }
  };

  const handleGenerateMore = async (batchSize: 4 | 12 | 20) => {
    setIsGenerating(true);
    setError('');
    setShowGenerateMore(false);

    try {
      // Get the specific prompt for this row
      const rowPrompt = getRowPrompt();

      const response = await fetch('/api/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          loraUrl,
          triggerWord,
          batchSize,
          // If we have row_prompts, use this row's prompt as custom prompt
          // Otherwise fall back to the stored presets/custom prompt
          selectedScenes: rowPrompt ? [] : (generation.preset_prompt_id ? generation.preset_prompt_id.split(', ').slice(rowIndex, rowIndex + 1) : []),
          customPrompt: rowPrompt || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      if (data.success && data.imageUrls) {
        // Reload the page to show new generations
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpscale = async () => {
    setIsUpscaling(true);
    setError('');

    try {
      const response = await fetch('/api/upscale-row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: generation.id,
          rowIndex,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upscale');
      }

      if (data.success && data.imageUrls) {
        onRowImagesUpdated(generation.id, rowIndex, data.imageUrls);
        // Mark upscale as used after successful upscale
        if (data.upscaleUsed) {
          setUpscaleUsed(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upscale');
    } finally {
      setIsUpscaling(false);
    }
  };

  if (isMobile) {
    // Mobile layout - compact icon-only buttons
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-3 items-center">
          {/* Remake Button - icon only */}
          <div className="relative">
            <button
              onClick={() => canRemake && setShowRemakeConfirm(true)}
              disabled={!canRemake || isRemaking || isGenerating || isUpscaling}
              className={`p-3 rounded-full transition-colors ${
                !canRemake
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
              title={upscaleUsed ? 'Cannot remake after upscaling' : remakeUsed ? 'Remake used' : 'Remake this row'}
            >
              {isRemaking ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : remakeUsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>

            {showRemakeConfirm && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 p-3">
                <p className="text-sm text-gray-700 mb-3">Remake this row? The 4 images will be replaced.</p>
                <div className="flex gap-2">
                  <button onClick={handleRemake} className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700">
                    Yes
                  </button>
                  <button onClick={() => setShowRemakeConfirm(false)} className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200">
                    No
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Generate More Button - icon only */}
          <div className="relative">
            <button
              onClick={() => setShowGenerateMore(!showGenerateMore)}
              disabled={isGenerating || isRemaking || isUpscaling}
              className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-400 transition-colors"
              title="Generate more images"
            >
              {isGenerating ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>

            {showGenerateMore && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 text-center">Generate more</p>
                </div>
                <button onClick={() => handleGenerateMore(4)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex justify-between">
                  <span className="text-gray-900">4 images</span>
                  <span className="text-indigo-600 font-medium">1 cr</span>
                </button>
                <button onClick={() => handleGenerateMore(12)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex justify-between">
                  <span className="text-gray-900">12 images</span>
                  <span className="text-indigo-600 font-medium">3 cr</span>
                </button>
                <button onClick={() => handleGenerateMore(20)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex justify-between border-b border-gray-100">
                  <span className="text-gray-900">20 images</span>
                  <span className="text-indigo-600 font-medium">4 cr</span>
                </button>
                <button onClick={() => setShowGenerateMore(false)} className="w-full px-4 py-2 text-center text-sm text-gray-500 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Upscale HD Button - icon only */}
          <button
            onClick={handleUpscale}
            disabled={isUpscaling || isRemaking || isGenerating}
            className={`p-3 rounded-full transition-colors ${
              upscaleUsed
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-400'
            }`}
            title={upscaleUsed ? 'Upscale used' : 'Upscale to HD'}
          >
            {isUpscaling ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : upscaleUsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>

        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    );
  }

  // Desktop layout - vertical stacked buttons
  return (
    <div className="flex flex-col gap-2">
      {/* Generate More Button */}
      <div className="relative">
        <button
          onClick={() => setShowGenerateMore(!showGenerateMore)}
          disabled={isGenerating || isRemaking}
          className="w-full px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs">Generating...</span>
            </span>
          ) : (
            'Generate More'
          )}
        </button>

        {showGenerateMore && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <div className="p-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 text-center">Same prompt, more images</p>
            </div>
            <button onClick={() => handleGenerateMore(4)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex justify-between items-center">
              <span className="text-gray-900">4 images</span>
              <span className="text-indigo-600 font-medium">1 credit</span>
            </button>
            <button onClick={() => handleGenerateMore(12)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex justify-between items-center">
              <span className="text-gray-900">12 images</span>
              <span className="text-indigo-600 font-medium">3 credits</span>
            </button>
            <button onClick={() => handleGenerateMore(20)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex justify-between items-center border-b border-gray-100">
              <span className="text-gray-900">20 images</span>
              <span className="text-indigo-600 font-medium">4 credits</span>
            </button>
            <button onClick={() => setShowGenerateMore(false)} className="w-full px-4 py-2 text-center text-sm text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Remake Button - available on any row, but only one free remake per batch */}
      <div className="relative">
        <button
          onClick={() => canRemake && setShowRemakeConfirm(true)}
          disabled={!canRemake || isRemaking || isGenerating}
          className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            !canRemake
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100'
          }`}
          title={upscaleUsed ? 'Cannot remake after upscaling' : remakeUsed ? 'Remake already used' : 'Remake this row'}
        >
          {isRemaking ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs">Remaking...</span>
            </span>
          ) : remakeUsed ? (
            <span className="flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Used
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Remake
            </span>
          )}
        </button>

        {showRemakeConfirm && (
          <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 p-3">
            <p className="text-sm text-gray-700 mb-3">
              Remake this row? The 4 images will be replaced with new ones.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRemake}
                className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
              >
                Yes, remake
              </button>
              <button
                onClick={() => setShowRemakeConfirm(false)}
                className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upscale HD Button */}
      <button
        onClick={handleUpscale}
        disabled={isUpscaling || isRemaking || isGenerating}
        className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          upscaleUsed
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isUpscaling
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400'
        }`}
        title={upscaleUsed ? 'Upscale already used' : 'Upscale this row to HD'}
      >
        {isUpscaling ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs">Upscaling...</span>
          </span>
        ) : upscaleUsed ? (
          <span className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Used
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Upscale HD
          </span>
        )}
      </button>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
