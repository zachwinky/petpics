'use client';

import { useState } from 'react';
import { PRESET_PROMPTS } from '@/lib/presetPrompts';
import { PLATFORM_PRESETS, DEFAULT_ASPECT_RATIO } from '@/lib/platformPresets';
import ModelSelector from './ModelSelector';
import GeneratingModal from './GeneratingModal';

interface Model {
  id: number;
  name: string;
  trigger_word: string;
  lora_url: string;
  training_images_count: number;
  preview_image_url?: string;
  created_at: Date;
}

interface GenerateInterfaceProps {
  models: Model[];
  selectedModel: Model | undefined;
}

export default function GenerateInterface({ models, selectedModel: initialModel }: GenerateInterfaceProps) {
  const [selectedModel, setSelectedModel] = useState<Model | undefined>(initialModel);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [batchSize, setBatchSize] = useState<4 | 12 | 20>(4);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState(DEFAULT_ASPECT_RATIO);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const maxScenes = batchSize === 4 ? 1 : batchSize === 12 ? 3 : 5;
  const batchCost = batchSize === 4 ? 1 : batchSize === 12 ? 3 : 4;

  const toggleScene = (promptId: string) => {
    if (batchSize === 4) {
      // Single scene mode
      setSelectedScenes([promptId]);
    } else {
      // Multi-scene mode
      if (selectedScenes.includes(promptId)) {
        setSelectedScenes(selectedScenes.filter(id => id !== promptId));
      } else if (selectedScenes.length < maxScenes) {
        setSelectedScenes([...selectedScenes, promptId]);
      }
    }
    setCustomPrompt(''); // Clear custom prompt when selecting scenes
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      setError('Please select a photo subject first');
      return;
    }

    if (selectedScenes.length === 0 && !customPrompt) {
      setError(`Please select ${batchSize === 4 ? 'a scene' : 'at least one scene'} or enter a custom prompt`);
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: selectedModel.id,
          loraUrl: selectedModel.lora_url,
          triggerWord: selectedModel.trigger_word,
          batchSize,
          selectedScenes,
          customPrompt: customPrompt || null,
          aspectRatio: selectedPlatform,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate images';

        if (response.status === 401) {
          errorMessage = 'Please sign in to generate images.';
        } else if (response.status === 402) {
          const data = await response.json();
          errorMessage = data.error || `Insufficient credits. Required: ${batchCost}, Current: ${data.current}`;
        } else {
          try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } catch (e) {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success && data.imageUrls) {
        console.log('Received imageUrls:', data.imageUrls);
        console.log('Number of images:', data.imageUrls.length);
        // Redirect to dashboard to show the newly generated photos
        window.location.href = `/dashboard/subjects/${selectedModel.id}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          {models.length > 1 ? 'Select Your Photo Subject' : 'Your Photo Subject'}
        </label>
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onSelect={(model) => {
            setSelectedModel(model);
            const url = new URL(window.location.href);
            url.searchParams.set('modelId', model.id.toString());
            window.history.pushState({}, '', url);
          }}
        />
      </div>

      {selectedModel && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-6">
          {/* Platform/Aspect Ratio Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Image Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {PLATFORM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPlatform(preset.id)}
                  className={`p-3 border-2 rounded-lg text-center transition-all cursor-pointer ${
                    selectedPlatform === preset.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 bg-white hover:border-indigo-400'
                  }`}
                >
                  {/* Visual aspect ratio preview */}
                  <div className="flex justify-center mb-2">
                    <div
                      className={`bg-gray-300 rounded ${
                        preset.id === 'instagram-feed' ? 'w-8 h-8' :
                        preset.id === 'instagram-portrait' ? 'w-8 h-10' :
                        preset.id === 'instagram-stories' ? 'w-6 h-10' :
                        preset.id === 'landscape' ? 'w-10 h-6' :
                        'w-7 h-10'
                      }`}
                    />
                  </div>
                  <div className="font-medium text-gray-900 text-sm">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.ratio}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Batch Size Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Batch Size
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setBatchSize(4);
                  setSelectedScenes([]);
                }}
                className={`p-4 border-2 rounded-lg text-center transition-all cursor-pointer ${
                  batchSize === 4
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300 bg-white hover:border-indigo-400'
                }`}
              >
                <div className="font-bold text-lg text-gray-900">4 Images</div>
                <div className="text-sm text-gray-600">1 scene</div>
                <div className="text-xs font-medium text-indigo-600 mt-1">1 credit</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBatchSize(12);
                  setSelectedScenes([]);
                }}
                className={`p-4 border-2 rounded-lg text-center transition-all cursor-pointer ${
                  batchSize === 12
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300 bg-white hover:border-indigo-400'
                }`}
              >
                <div className="font-bold text-lg text-gray-900">12 Images</div>
                <div className="text-sm text-gray-600">Up to 3 scenes</div>
                <div className="text-xs font-medium text-indigo-600 mt-1">3 credits</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBatchSize(20);
                  setSelectedScenes([]);
                }}
                className={`p-4 border-2 rounded-lg text-center transition-all cursor-pointer ${
                  batchSize === 20
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-300 bg-white hover:border-indigo-400'
                }`}
              >
                <div className="font-bold text-lg text-gray-900">20 Images</div>
                <div className="text-sm text-gray-600">Up to 5 scenes</div>
                <div className="text-xs font-medium text-indigo-600 mt-1">4 credits</div>
              </button>
            </div>
          </div>

          {/* Scene Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose {batchSize === 4 ? 'a Background' : `Backgrounds (${selectedScenes.length}/${maxScenes})`}
            </label>
            {batchSize > 4 && (
              <p className="text-xs text-gray-500 mb-3">
                Select up to {maxScenes} scenes. Images will be divided evenly across selected scenes.
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => toggleScene(preset.id)}
                  disabled={batchSize > 4 && !selectedScenes.includes(preset.id) && selectedScenes.length >= maxScenes}
                  className={`p-4 border-2 rounded-lg text-left transition-all cursor-pointer ${
                    selectedScenes.includes(preset.id)
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-300 bg-white hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm mb-1">
                    {preset.label}
                  </div>
                  <div className="text-xs text-gray-600">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Advanced: Custom Prompt
            </button>

            {/* Custom Prompt - Hidden by default */}
            {showAdvanced && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Prompt
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder:text-gray-400"
                  rows={3}
                  placeholder={`e.g., ${selectedModel.trigger_word} on a wooden table with morning light, cozy coffee shop atmosphere`}
                  value={customPrompt}
                  onChange={(e) => {
                    setCustomPrompt(e.target.value);
                    if (e.target.value) {
                      setSelectedScenes([]); // Clear scenes when custom prompt is entered
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Include "{selectedModel.trigger_word}" in your prompt for best results
                </p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            className="w-full py-3 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            onClick={handleGenerate}
            disabled={isGenerating || (selectedScenes.length === 0 && !customPrompt)}
          >
            {isGenerating ? 'Generating Your Photos...' : `Generate ${batchSize} Photos (${batchCost} credits)`}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Generating Modal */}
      <GeneratingModal isOpen={isGenerating} imageCount={batchSize} />
    </div>
  );
}
