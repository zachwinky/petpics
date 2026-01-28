'use client';

import { useState } from 'react';

interface AnalyzeProductButtonProps {
  modelId: number;
  previewImageUrl?: string;
  hasDescription: boolean;
}

export default function AnalyzeProductButton({
  modelId,
  previewImageUrl,
  hasDescription,
}: AnalyzeProductButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(hasDescription);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!previewImageUrl) {
      setError('No preview image available to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          imageUrl: previewImageUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze product');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Show status with option to re-analyze
  if (analyzed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 text-sm text-green-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Text analyzed</span>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !previewImageUrl}
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
          title="Re-extract text from the AI-generated preview image"
        >
          {isAnalyzing ? 'Analyzing...' : 'Re-analyze from preview'}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || !previewImageUrl}
        className="text-sm text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50 flex items-center gap-1"
        title="Extract text from the AI-generated preview image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {isAnalyzing ? 'Analyzing...' : 'Analyze preview text'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!previewImageUrl && (
        <p className="text-xs text-gray-400">Generate a preview first</p>
      )}
    </div>
  );
}
