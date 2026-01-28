export interface VideoPreset {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

export const VIDEO_PRESETS: VideoPreset[] = [
  {
    id: 'orbit',
    label: 'Orbit',
    description: 'Camera rotates around the product',
    prompt: 'slow 180 degree orbit around the product, smooth camera movement',
  },
  {
    id: 'zoom-in',
    label: 'Zoom In',
    description: 'Cinematic zoom into the product',
    prompt: 'gentle zoom in on the product, cinematic shallow depth of field',
  },
  {
    id: 'pull-back',
    label: 'Pull Back',
    description: 'Camera reveals the full scene',
    prompt: 'camera slowly pulls back revealing the full scene',
  },
  {
    id: 'atmospheric',
    label: 'Atmospheric',
    description: 'Subtle lighting changes',
    prompt: 'soft lighting shifts across the product surface, subtle reflections',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    description: 'Ambient motion and particles',
    prompt: 'subtle ambient motion, steam or particles drift gently in background',
  },
];

export const VIDEO_GENERATION_CREDITS = 5; // Credits required per video
