'use client';

import { useState } from 'react';

interface PreviewButtonProps {
  modelId: number;
  loraUrl: string;
  triggerWord: string;
  currentPreviewUrl?: string;
  onPreviewGenerated?: (imageUrl: string) => void;
}

export default function PreviewButton({
  modelId,
  loraUrl,
  triggerWord,
  currentPreviewUrl,
  onPreviewGenerated,
}: PreviewButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleRemakePreview = async () => {
    const hasPreview = !!currentPreviewUrl;
    const confirmMessage = hasPreview
      ? 'Generate a new preview image? This will replace the current one.'
      : 'Generate a preview image for this photo subject?';

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          loraUrl,
          triggerWord,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate preview');
      }

      const data = await response.json();
      if (onPreviewGenerated) {
        onPreviewGenerated(data.imageUrl);
      }
      // Reload page to show new preview
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasPreview = !!currentPreviewUrl;

  return (
    <>
      <button
        onClick={handleRemakePreview}
        disabled={isGenerating}
        className={`text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${
          hasPreview
            ? 'text-gray-500 hover:text-gray-700'
            : 'px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium'
        }`}
        title={hasPreview ? 'Generate a new preview image' : 'Generate preview image'}
      >
        {!hasPreview && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
        {hasPreview && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        {isGenerating
          ? hasPreview
            ? 'Remaking...'
            : 'Generating...'
          : hasPreview
          ? 'Remake Preview'
          : 'Generate Preview'}
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
          {error}
        </div>
      )}
    </>
  );
}
