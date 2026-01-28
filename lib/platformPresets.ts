// Platform presets for image aspect ratios
// Each preset is optimized for specific social media platforms

export interface PlatformPreset {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'instagram-feed',
    label: 'Instagram Feed',
    ratio: '1:1',
    width: 1024,
    height: 1024,
  },
  {
    id: 'instagram-portrait',
    label: 'Instagram Portrait',
    ratio: '4:5',
    width: 1024,
    height: 1280,
  },
  {
    id: 'instagram-stories',
    label: 'Stories / Reels',
    ratio: '9:16',
    width: 720,
    height: 1280,
  },
  {
    id: 'landscape',
    label: 'Facebook / LinkedIn',
    ratio: '16:9',
    width: 1280,
    height: 720,
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    ratio: '2:3',
    width: 1024,
    height: 1536,
  },
];

// Get image dimensions for a given aspect ratio ID
export function getImageDimensions(aspectRatioId: string): { width: number; height: number } {
  const preset = PLATFORM_PRESETS.find(p => p.id === aspectRatioId);
  if (!preset) {
    // Default to square if not found
    return { width: 1024, height: 1024 };
  }
  return { width: preset.width, height: preset.height };
}

// Default aspect ratio
export const DEFAULT_ASPECT_RATIO = 'instagram-feed';
