export interface PresetPrompt {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'park-scene',
    label: 'Park Scene',
    description: 'Happy outdoor park setting',
    prompt: 'playing in a sunny park with grass and trees in background',
  },
  {
    id: 'beach-scene',
    label: 'Beach Scene',
    description: 'Coastal beach atmosphere',
    prompt: 'running on sandy beach with ocean waves and blue sky',
  },
  {
    id: 'cozy-home',
    label: 'Cozy Home',
    description: 'Comfortable indoor setting',
    prompt: 'relaxing on a cozy couch with warm home lighting',
  },
  {
    id: 'studio-white',
    label: 'Studio Portrait',
    description: 'Professional white background',
    prompt: 'in a professional studio with white background and soft lighting',
  },
  {
    id: 'autumn-leaves',
    label: 'Autumn Leaves',
    description: 'Fall foliage setting',
    prompt: 'playing in autumn leaves with golden fall colors',
  },
  {
    id: 'flower-field',
    label: 'Flower Field',
    description: 'Surrounded by flowers',
    prompt: 'sitting in a field of colorful wildflowers',
  },
  {
    id: 'snowy-winter',
    label: 'Snowy Winter',
    description: 'Winter wonderland',
    prompt: 'playing in fresh snow with winter scenery',
  },
  {
    id: 'urban-street',
    label: 'Urban Street',
    description: 'City sidewalk scene',
    prompt: 'walking on a city street with urban background',
  },
  {
    id: 'forest-trail',
    label: 'Forest Trail',
    description: 'Nature hiking trail',
    prompt: 'on a forest hiking trail surrounded by trees',
  },
  {
    id: 'pet-bed',
    label: 'Pet Bed',
    description: 'Comfortable pet bed',
    prompt: 'resting on a comfortable pet bed with soft blankets',
  },
  {
    id: 'garden-setting',
    label: 'Garden Setting',
    description: 'Backyard garden scene',
    prompt: 'in a beautiful garden surrounded by greenery and flowers',
  },
  {
    id: 'living-room',
    label: 'Living Room',
    description: 'Home living room setting',
    prompt: 'sitting in a cozy living room with natural window light',
  },
  {
    id: 'holiday-theme',
    label: 'Holiday Theme',
    description: 'Festive holiday atmosphere',
    prompt: 'with festive holiday decorations and warm cozy lighting',
  },
  {
    id: 'sunset-golden',
    label: 'Golden Hour',
    description: 'Beautiful sunset lighting',
    prompt: 'outdoors during golden hour with warm sunset lighting',
  },
  {
    id: 'rainy-window',
    label: 'Rainy Day',
    description: 'Cozy rainy day indoors',
    prompt: 'looking out a window on a rainy day with soft indoor lighting',
  },
];
