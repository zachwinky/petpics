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
    prompt: 'joyfully bounding through sunlit meadow, ears flying, pure happiness, golden hour glow, lush green grass',
  },
  {
    id: 'beach-scene',
    label: 'Beach Scene',
    description: 'Coastal beach atmosphere',
    prompt: 'sprinting along pristine shoreline at sunset, water droplets sparkling, wind-swept fur, dramatic orange sky',
  },
  {
    id: 'cozy-home',
    label: 'Cozy Home',
    description: 'Comfortable indoor setting',
    prompt: 'adorably curled up on plush velvet sofa, dreamy soft window light, peaceful contentment, warm cozy atmosphere',
  },
  {
    id: 'studio-white',
    label: 'Studio Portrait',
    description: 'Professional white background',
    prompt: 'elegant studio portrait, crisp white backdrop, artistic rim lighting, magazine cover quality, perfect pose',
  },
  {
    id: 'autumn-leaves',
    label: 'Autumn Leaves',
    description: 'Fall foliage setting',
    prompt: 'frolicking through golden autumn leaves, warm fall colors swirling, magical light filtering through trees, playful joy',
  },
  {
    id: 'flower-field',
    label: 'Flower Field',
    description: 'Surrounded by flowers',
    prompt: 'nestled among vibrant wildflowers, soft bokeh background, enchanting spring garden, fairytale atmosphere, colorful blooms',
  },
  {
    id: 'snowy-winter',
    label: 'Snowy Winter',
    description: 'Winter wonderland',
    prompt: 'bounding through pristine powder snow, frost-kissed fur, breath visible in cold air, winter wonderland magic, sparkling ice',
  },
  {
    id: 'urban-street',
    label: 'Urban Street',
    description: 'City sidewalk scene',
    prompt: 'confident stride on city sidewalk, urban bokeh lights behind, street photography style, cool metropolitan vibe',
  },
  {
    id: 'forest-trail',
    label: 'Forest Trail',
    description: 'Nature hiking trail',
    prompt: 'exploring enchanted forest trail, dappled sunlight through canopy, majestic wilderness, adventure spirit, lush greenery',
  },
  {
    id: 'pet-bed',
    label: 'Pet Bed',
    description: 'Comfortable pet bed',
    prompt: 'peacefully resting on luxurious pet bed, soft blankets, serene expression, cozy bedroom setting, gentle morning light',
  },
  {
    id: 'garden-setting',
    label: 'Garden Setting',
    description: 'Backyard garden scene',
    prompt: 'exploring beautiful cottage garden, surrounded by roses and greenery, butterfly nearby, enchanting summer day, natural beauty',
  },
  {
    id: 'living-room',
    label: 'Living Room',
    description: 'Home living room setting',
    prompt: 'relaxing in stylish living room, beautiful natural window light, modern interior design, comfortable home atmosphere',
  },
  {
    id: 'holiday-theme',
    label: 'Holiday Theme',
    description: 'Festive holiday atmosphere',
    prompt: 'surrounded by festive holiday decorations, twinkling lights, cozy fireplace glow, christmas tree bokeh, warm celebration',
  },
  {
    id: 'sunset-golden',
    label: 'Golden Hour',
    description: 'Beautiful sunset lighting',
    prompt: 'bathed in warm golden sunset light, silhouette rim lighting, ethereal glow, cinematic mood, breathtaking sky colors',
  },
  {
    id: 'rainy-window',
    label: 'Rainy Day',
    description: 'Cozy rainy day indoors',
    prompt: 'gazing thoughtfully out rain-streaked window, soft moody lighting, contemplative mood, cozy rainy day vibes, reflective',
  },
  {
    id: 'cozy-bedtime',
    label: 'Cozy Bedtime',
    description: 'Tucked in bed like a human',
    prompt: 'adorably tucked into cozy bed with soft blankets and pillows, wearing reading glasses, holding a book or scrolling smartphone, or with cucumber slices on eyes and face mask, nightstand with lamp, warm bedroom lighting, hilarious human-like pose, comfortable and relatable',
  },
];
