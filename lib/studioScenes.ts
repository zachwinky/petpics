/**
 * Curated scene presets for the Studio overlay.
 * These are a subset of PRESET_PROMPTS optimized for print quality.
 * The promptId maps to existing presets in lib/presetPrompts.ts.
 */

import type { PresetCategory } from './presetPrompts';

export interface StudioScene {
  id: string;
  label: string;
  previewImage: string;
  promptId: string; // references PRESET_PROMPTS id
  category?: PresetCategory; // defaults to 'classics' if omitted
}

export type { PresetCategory };

export const STUDIO_CATEGORIES: { id: PresetCategory; label: string }[] = [
  { id: 'classics', label: 'Classics' },
  { id: 'fun', label: 'Fun & Quirky' },
  { id: 'seasonal', label: 'Seasonal' },
];

export function getStudioScenesForCategory(category: PresetCategory): StudioScene[] {
  if (category === 'classics') {
    return STUDIO_SCENES.filter(s => !s.category || s.category === 'classics');
  }
  return STUDIO_SCENES.filter(s => s.category === category);
}

/**
 * Curated scenes for print quality.
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

  // Fun & Quirky
  {
    id: 'fun-scrolling-phone',
    label: 'Doomscrolling',
    previewImage: '/studio-scenes/fun-scrolling-phone.svg',
    promptId: 'fun-scrolling-phone',
    category: 'fun',
  },
  {
    id: 'fun-chef',
    label: 'Master Chef',
    previewImage: '/studio-scenes/fun-chef.svg',
    promptId: 'fun-chef',
    category: 'fun',
  },
  {
    id: 'fun-dj',
    label: 'DJ Booth',
    previewImage: '/studio-scenes/fun-dj.svg',
    promptId: 'fun-dj',
    category: 'fun',
  },
  {
    id: 'fun-road-trip',
    label: 'Road Trip',
    previewImage: '/studio-scenes/fun-road-trip.svg',
    promptId: 'fun-road-trip',
    category: 'fun',
  },
  {
    id: 'fun-yoga',
    label: 'Yoga & Spa',
    previewImage: '/studio-scenes/fun-yoga.svg',
    promptId: 'fun-yoga',
    category: 'fun',
  },
  {
    id: 'fun-office-worker',
    label: 'Office Worker',
    previewImage: '/studio-scenes/fun-office-worker.svg',
    promptId: 'fun-office-worker',
    category: 'fun',
  },
  {
    id: 'fun-artist',
    label: 'Artist',
    previewImage: '/studio-scenes/fun-artist.svg',
    promptId: 'fun-artist',
    category: 'fun',
  },
  {
    id: 'fun-astronaut',
    label: 'Astronaut',
    previewImage: '/studio-scenes/fun-astronaut.svg',
    promptId: 'fun-astronaut',
    category: 'fun',
  },
  {
    id: 'fun-graduation',
    label: 'Graduate',
    previewImage: '/studio-scenes/fun-graduation.svg',
    promptId: 'fun-graduation',
    category: 'fun',
  },
  {
    id: 'fun-rockstar',
    label: 'Rockstar',
    previewImage: '/studio-scenes/fun-rockstar.svg',
    promptId: 'fun-rockstar',
    category: 'fun',
  },

  // Seasonal
  {
    id: 'oval-office',
    label: 'Oval Office',
    previewImage: '/studio-scenes/oval-office.svg',
    promptId: 'presidents-oval-office',
    category: 'seasonal',
  },
  {
    id: 'valentine-cupid',
    label: 'Cupid',
    previewImage: '/studio-scenes/valentine-cupid.svg',
    promptId: 'valentine-cupid',
    category: 'seasonal',
  },
  {
    id: 'superbowl-champion',
    label: 'Champion',
    previewImage: '/studio-scenes/superbowl-champion.svg',
    promptId: 'superbowl-champion',
    category: 'seasonal',
  },
  {
    id: 'cozy-bedtime',
    label: 'Cozy Bedtime',
    previewImage: '/studio-scenes/cozy-bedtime.svg',
    promptId: 'cozy-bedtime',
    category: 'seasonal',
  },
];

/**
 * Get a studio scene by its ID.
 */
export function getStudioSceneById(sceneId: string): StudioScene | undefined {
  return STUDIO_SCENES.find(s => s.id === sceneId);
}
