'use client';

import { useState } from 'react';
import { VIDEO_PRESETS, VIDEO_GENERATION_CREDITS } from '@/lib/videoPresets';

interface VideoPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  modelId?: number;
  onVideoGenerated: (videoId: number) => void;
}

export default function VideoPromptModal({
  isOpen,
  onClose,
  imageUrl,
  modelId,
  onVideoGenerated,
}: VideoPromptModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePresetClick = (presetId: string) => {
    const preset = VIDEO_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setCustomPrompt(preset.prompt);
    }
  };

  const handleGenerate = async () => {
    if (!customPrompt.trim()) {
      setError('Please select a motion preset or enter a custom prompt');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          prompt: customPrompt.trim(),
          modelId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError(`Insufficient credits. You need ${data.required} credits, but you have ${data.current}.`);
        } else if (response.status === 429) {
          setError('Rate limit exceeded. Please wait before generating another video.');
        } else {
          setError(data.error || 'Failed to start video generation');
        }
        return;
      }

      // Success - notify parent and close
      onVideoGenerated(data.videoId);
      onClose();
    } catch (err) {
      console.error('Video generation error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setSelectedPreset(null);
      setCustomPrompt('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Video</h2>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Image Preview */}
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Source image"
              className="max-w-xs rounded-lg border border-gray-200"
            />
          </div>

          {/* Motion Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motion Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VIDEO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  disabled={isGenerating}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedPreset === preset.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  <div className="font-medium text-sm text-gray-900">{preset.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motion Prompt
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setSelectedPreset(null);
              }}
              disabled={isGenerating}
              placeholder="Describe how you want the video to move..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 text-gray-900 placeholder:text-gray-400"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a preset above or write your own motion description
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Credits Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Cost:</span>
              <span className="font-medium text-gray-900">{VIDEO_GENERATION_CREDITS} credits</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Video generation may take 2-5 minutes
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !customPrompt.trim()}
            className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generate Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
