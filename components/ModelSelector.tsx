'use client';

import { useState } from 'react';

interface Model {
  id: number;
  name: string;
  trigger_word: string;
  lora_url: string;
  training_images_count: number;
  preview_image_url?: string;
  created_at: Date;
}

interface ModelSelectorProps {
  models: Model[];
  selectedModel: Model | undefined;
  onSelect: (model: Model) => void;
}

export default function ModelSelector({ models, selectedModel, onSelect }: ModelSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const canExpand = models.length > 1;

  const handleToggle = () => {
    if (canExpand) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = (model: Model) => {
    onSelect(model);
    setIsExpanded(false);
  };

  if (!selectedModel) {
    return null;
  }

  return (
    <div className="relative">
      {/* Selected Model Card */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-4 p-3 border-2 rounded-lg transition-all text-left ${
          isExpanded
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-200 bg-white hover:border-indigo-300'
        } ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Preview Image */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
          {selectedModel.preview_image_url ? (
            <img
              src={selectedModel.preview_image_url}
              alt={selectedModel.trigger_word}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Model Info */}
        <div className="flex-grow min-w-0">
          <div className="font-semibold text-gray-900 truncate">{selectedModel.trigger_word}</div>
          <div className="text-sm text-gray-500">{selectedModel.training_images_count} training images</div>
        </div>

        {/* Chevron (only show if can expand) */}
        {canExpand && (
          <div className="flex-shrink-0">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {/* Expanded Options */}
      {isExpanded && canExpand && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          {models.map((model) => {
            const isSelected = model.id === selectedModel.id;
            return (
              <button
                key={model.id}
                onClick={() => handleSelect(model)}
                className={`relative p-3 border-2 rounded-lg transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
              >
                {/* Checkmark for selected */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Preview Image */}
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                  {model.preview_image_url ? (
                    <img
                      src={model.preview_image_url}
                      alt={model.trigger_word}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Model Info */}
                <div className="font-medium text-gray-900 text-sm truncate">{model.trigger_word}</div>
                <div className="text-xs text-gray-500">{model.training_images_count} training images</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
