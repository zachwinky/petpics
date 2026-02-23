/**
 * Curated scene presets for the Studio overlay.
 * These are a subset of PRESET_PROMPTS optimized for print quality.
 * The promptId maps to existing presets in lib/presetPrompts.ts.
 */

export interface StudioScene {
  id: string;
  label: string;
  previewImage: string;
  promptId: string; // references PRESET_PROMPTS id
}

/**
 * 12 curated scenes that consistently produce great results at print quality.
 * Preview images are SVG placeholders in /public/studio-scenes/{id}.svg
 */
export const STUDIO_SCENES: StudioScene[] = [
  {
    id: 'studio-portrait',
    label: 'Studio Portrait',
    previewImage: '/studio-scenes/studio-portrait.svg',
    promptId: 'studio-white',
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    previewImage: '/studio-scenes/golden-hour.svg',
    promptId: 'sunset-golden',
  },
  {
    id: 'flower-field',
    label: 'Flower Field',
    previewImage: '/studio-scenes/flower-field.svg',
    promptId: 'flower-field',
  },
  {
    id: 'cozy-home',
    label: 'Cozy Home',
    previewImage: '/studio-scenes/cozy-home.svg',
    promptId: 'cozy-home',
  },
  {
    id: 'autumn-leaves',
    label: 'Autumn Leaves',
    previewImage: '/studio-scenes/autumn-leaves.svg',
    promptId: 'autumn-leaves',
  },
  {
    id: 'snowy-winter',
    label: 'Snowy Winter',
    previewImage: '/studio-scenes/snowy-winter.svg',
    promptId: 'snowy-winter',
  },
  {
    id: 'park-scene',
    label: 'Park Scene',
    previewImage: '/studio-scenes/park-scene.svg',
    promptId: 'park-scene',
  },
  {
    id: 'beach-day',
    label: 'Beach Day',
    previewImage: '/studio-scenes/beach-day.svg',
    promptId: 'beach-scene',
  },
  {
    id: 'forest-trail',
    label: 'Forest Trail',
    previewImage: '/studio-scenes/forest-trail.svg',
    promptId: 'forest-trail',
  },
  {
    id: 'garden-setting',
    label: 'Garden Setting',
    previewImage: '/studio-scenes/garden-setting.svg',
    promptId: 'garden-setting',
  },
  {
    id: 'rainy-day',
    label: 'Rainy Day',
    previewImage: '/studio-scenes/rainy-day.svg',
    promptId: 'rainy-window',
  },
  {
    id: 'holiday-theme',
    label: 'Holiday Theme',
    previewImage: '/studio-scenes/holiday-theme.svg',
    promptId: 'holiday-theme',
  },
];

/**
 * Get a studio scene by its ID.
 */
export function getStudioSceneById(sceneId: string): StudioScene | undefined {
  return STUDIO_SCENES.find(s => s.id === sceneId);
}
