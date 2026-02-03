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
  // Valentine's Day
  {
    id: 'valentine-cupid',
    label: 'Cupid',
    description: 'Adorable cupid with wings and bow',
    prompt: 'dressed as adorable cupid with tiny white angel wings and golden bow and arrow, surrounded by floating hearts, soft pink clouds, Valentine romantic atmosphere, cherub-like cuteness',
  },
  {
    id: 'valentine-rose',
    label: 'Rose Delivery',
    description: 'Holding a rose or love letter',
    prompt: 'holding single red rose in mouth or paws, sitting beside love letter with heart seal, romantic red and pink setting, Valentine gift delivery, sweet devoted expression',
  },
  {
    id: 'valentine-chocolates',
    label: 'Chocolates',
    description: 'With heart-shaped chocolate box',
    prompt: 'peeking out of giant heart-shaped chocolate box, surrounded by wrapped chocolates and candy hearts, Valentine gift surprise, adorable mischievous expression, pink and red decor',
  },
  {
    id: 'valentine-balloons',
    label: 'Heart Balloons',
    description: 'Surrounded by heart balloons',
    prompt: 'surrounded by floating red and pink heart-shaped balloons, festive Valentine party atmosphere, confetti, joyful celebratory mood, bright cheerful lighting',
  },
  {
    id: 'valentine-portrait',
    label: 'Be My Valentine',
    description: 'Classic Valentine portrait',
    prompt: 'elegant Valentine portrait with red bow tie or pink ribbon collar, soft romantic bokeh hearts in background, studio lighting, greeting card perfect, loving gaze',
  },
];
