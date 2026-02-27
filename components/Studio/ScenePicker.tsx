'use client';

import { useState } from 'react';
import { STUDIO_CATEGORIES, getStudioScenesForCategory, type PresetCategory } from '@/lib/studioScenes';

interface ScenePickerProps {
  petName: string;
  onScenesSelected: (sceneIds: string[]) => void;
}

export default function ScenePicker({ petName, onScenesSelected }: ScenePickerProps) {
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('fun');

  const toggleScene = (sceneId: string) => {
    setSelectedScenes(prev => {
      if (prev.includes(sceneId)) {
        return prev.filter(id => id !== sceneId);
      }
      if (prev.length >= 4) return prev;
      return [...prev, sceneId];
    });
  };

  const filteredScenes = getStudioScenesForCategory(activeCategory);
  const hiddenSelectedCount = selectedScenes.filter(
    id => !filteredScenes.find(s => s.id === id)
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-4 px-4">
        <h2 className="text-white text-xl font-semibold mb-1">
          {petName}&apos;s Portrait Studio
        </h2>
        <p className="text-white/60 text-sm">
          Pick 4 scenes
          {selectedScenes.length > 0 && (
            <span className="text-white/90 ml-2">
              — {selectedScenes.length} of 4 selected
            </span>
          )}
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 justify-center px-4 mb-4">
        {STUDIO_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Cross-tab indicator */}
      {hiddenSelectedCount > 0 && (
        <p className="text-center text-white/50 text-xs mb-2 px-4">
          + {hiddenSelectedCount} scene(s) selected from other tabs
        </p>
      )}

      {/* Scene grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredScenes.map(scene => {
            const isSelected = selectedScenes.includes(scene.id);
            return (
              <button
                key={scene.id}
                onClick={() => toggleScene(scene.id)}
                className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-white scale-[1.02]'
                    : 'ring-1 ring-white/10 hover:ring-white/30'
                } ${
                  selectedScenes.length >= 4 && !isSelected ? 'opacity-40' : ''
                }`}
              >
                {/* Preview image */}
                <div className="aspect-square bg-white/5">
                  <img
                    src={scene.previewImage}
                    alt={scene.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if preview image doesn't exist yet
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {/* Fallback placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                    <span className="text-white/30 text-4xl">🎨</span>
                  </div>
                </div>

                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                  <span className="text-white text-xs font-medium">{scene.label}</span>
                </div>

                {/* Selection checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom action */}
      {selectedScenes.length === 4 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <button
            onClick={() => onScenesSelected(selectedScenes)}
            className="w-full py-4 rounded-xl bg-white text-black font-semibold text-base transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            Create Portraits →
          </button>
        </div>
      )}
    </div>
  );
}
