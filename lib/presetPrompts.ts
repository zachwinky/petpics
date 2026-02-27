export type PresetCategory = 'classics' | 'fun' | 'seasonal';

export interface PresetPrompt {
  id: string;
  label: string;
  description: string;
  prompt: string;
  catPrompt?: string; // Cat-specific version of the prompt (if different from dog)
  category?: PresetCategory; // defaults to 'classics' if omitted
}

export type PetType = 'dog' | 'cat' | 'unknown';

export const PRESET_CATEGORIES: { id: PresetCategory; label: string }[] = [
  { id: 'classics', label: 'Classics' },
  { id: 'fun', label: 'Fun & Quirky' },
  { id: 'seasonal', label: 'Seasonal' },
];

/**
 * Get the appropriate prompt for a pet type.
 * Uses catPrompt if available and pet is a cat, otherwise uses default prompt.
 */
export function getPromptForPetType(promptId: string, petType: PetType): string {
  const preset = PRESET_PROMPTS.find(p => p.id === promptId);
  if (!preset) return '';

  if (petType === 'cat' && preset.catPrompt) {
    return preset.catPrompt;
  }
  return preset.prompt;
}

/**
 * Get a preset prompt by ID.
 */
export function getPresetById(promptId: string): PresetPrompt | undefined {
  return PRESET_PROMPTS.find(p => p.id === promptId);
}

/**
 * Get presets filtered by category. Presets without a category default to 'classics'.
 */
export function getPresetsForCategory(category: PresetCategory): PresetPrompt[] {
  if (category === 'classics') {
    return PRESET_PROMPTS.filter(p => !p.category || p.category === 'classics');
  }
  return PRESET_PROMPTS.filter(p => p.category === category);
}

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: 'park-scene',
    label: 'Park Scene',
    description: 'Happy outdoor park setting',
    prompt: 'joyfully bounding through sunlit meadow, ears flying, pure happiness, golden hour glow, lush green grass',
    catPrompt: 'gracefully exploring sunlit meadow, alert ears, curious expression, golden hour glow, lush green grass, elegant feline poise',
  },
  {
    id: 'beach-scene',
    label: 'Beach Scene',
    description: 'Coastal beach atmosphere',
    prompt: 'sprinting along pristine shoreline at sunset, water droplets sparkling, wind-swept fur, dramatic orange sky',
    catPrompt: 'delicately walking along pristine shoreline at sunset, cautious paws near water, wind-swept fur, dramatic orange sky, graceful stance',
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
    catPrompt: 'playfully batting at falling golden autumn leaves, warm fall colors swirling, magical light filtering through trees, curious hunter instincts',
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
    catPrompt: 'cautiously stepping through pristine powder snow, paws lifting high, frost-kissed fur, breath visible in cold air, winter wonderland magic',
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
    catPrompt: 'stalking through enchanted forest trail, dappled sunlight through canopy, hunter instincts, majestic wilderness, lush greenery',
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
    category: 'seasonal',
    prompt: 'dressed as adorable cupid with tiny white angel wings and golden bow and arrow, surrounded by floating hearts, soft pink clouds, Valentine romantic atmosphere, cherub-like cuteness',
  },
  {
    id: 'valentine-rose',
    label: 'Rose Delivery',
    description: 'Holding a rose or love letter',
    category: 'seasonal',
    prompt: 'holding single red rose in mouth or paws, sitting beside love letter with heart seal, romantic red and pink setting, Valentine gift delivery, sweet devoted expression',
  },
  {
    id: 'valentine-chocolates',
    label: 'Chocolates',
    description: 'With heart-shaped chocolate box',
    category: 'seasonal',
    prompt: 'peeking out of giant heart-shaped chocolate box, surrounded by wrapped chocolates and candy hearts, Valentine gift surprise, adorable mischievous expression, pink and red decor',
  },
  {
    id: 'valentine-balloons',
    label: 'Heart Balloons',
    description: 'Surrounded by heart balloons',
    category: 'seasonal',
    prompt: 'surrounded by floating red and pink heart-shaped balloons, festive Valentine party atmosphere, confetti, joyful celebratory mood, bright cheerful lighting',
  },
  {
    id: 'valentine-portrait',
    label: 'Be My Valentine',
    description: 'Classic Valentine portrait',
    category: 'seasonal',
    prompt: 'elegant Valentine portrait with red bow tie or pink ribbon collar, soft romantic bokeh hearts in background, studio lighting, greeting card perfect, loving gaze',
  },
  // Super Bowl
  {
    id: 'superbowl-jersey',
    label: 'Game Day Jersey',
    description: 'Wearing a football jersey',
    category: 'seasonal',
    prompt: 'wearing oversized football jersey, sitting on couch surrounded by game day snacks and chips, big screen TV showing football in background, foam finger nearby, excited fan expression, sports party atmosphere',
  },
  {
    id: 'superbowl-touchdown',
    label: 'Touchdown',
    description: 'Scoring a touchdown on the field',
    category: 'seasonal',
    prompt: 'running with football in mouth across football field end zone, stadium lights blazing, crowd cheering in background, dramatic sports photography, touchdown celebration, confetti falling',
  },
  {
    id: 'superbowl-halftime',
    label: 'Halftime Show',
    description: 'Performing at the halftime show',
    category: 'seasonal',
    prompt: 'performing on massive Super Bowl halftime stage, dramatic concert lighting, pyrotechnics and fireworks, wearing sparkly outfit, rockstar pose, packed stadium crowd, epic performance moment',
  },
  {
    id: 'superbowl-champion',
    label: 'Champion',
    description: 'Celebrating with the trophy',
    category: 'seasonal',
    prompt: 'triumphantly holding Lombardi trophy, showered in confetti and streamers, champion celebration, wearing football helmet tilted to side, victory podium, camera flashes, ultimate champion moment',
  },

  // Presidents' Day
  {
    id: 'presidents-oval-office',
    label: 'Oval Office',
    description: 'Commander in chief at the desk',
    category: 'seasonal',
    prompt: 'sitting behind the Resolute Desk in the Oval Office, wearing a tiny presidential suit and tie, American flags on either side, looking dignified and important, presidential portrait lighting, leader of the free world',
  },
  {
    id: 'presidents-mount-rushmore',
    label: 'Mount Rushmore',
    description: 'Carved into the monument',
    category: 'seasonal',
    prompt: 'face carved into Mount Rushmore alongside the presidents, majestic granite sculpture, dramatic mountain landscape, blue sky, iconic American monument, heroic stone carving',
  },
  {
    id: 'presidents-washington',
    label: 'Crossing the Delaware',
    description: 'Leading the troops across the river',
    category: 'seasonal',
    prompt: 'standing heroically in wooden boat crossing icy Delaware River, wearing Revolutionary War uniform and tricorn hat, dramatic stormy sky, soldiers rowing behind, iconic patriotic painting style, George Washington pose',
  },
  {
    id: 'presidents-lincoln',
    label: 'Lincoln Memorial',
    description: 'Seated at the memorial',
    category: 'seasonal',
    prompt: 'seated majestically in giant marble chair of the Lincoln Memorial, wearing top hat and bow tie, monumental marble columns, dramatic upward lighting, dignified contemplative expression, iconic memorial pose',
  },

  // Fun & Quirky — pets doing human things
  {
    id: 'fun-scrolling-phone',
    label: 'Doomscrolling',
    description: 'Scrolling through a phone on the couch',
    category: 'fun',
    prompt: 'lounging on couch holding smartphone with both paws, scrolling social media, snacks beside them, blanket over lap, cozy indoor lighting, humorous human-like pose',
    catPrompt: 'lounging on couch holding smartphone with both paws, scrolling with intense focus, one paw tapping screen, snacks beside them, blanket over lap, cozy indoor lighting, humorous human-like pose',
  },
  {
    id: 'fun-chef',
    label: 'Master Chef',
    description: 'Cooking up a gourmet meal',
    category: 'fun',
    prompt: 'wearing white chef hat and apron, standing at kitchen counter with ingredients, holding wooden spoon, pots simmering on stove, professional kitchen setting, dramatic cooking show lighting, confident chef expression',
    catPrompt: 'wearing white chef hat and apron, standing at kitchen counter, suspiciously sniffing a fish fillet, pots simmering on stove, professional kitchen setting, dramatic cooking show lighting, mischievous expression',
  },
  {
    id: 'fun-dj',
    label: 'DJ Booth',
    description: 'Spinning tracks at a DJ booth',
    category: 'fun',
    prompt: 'wearing oversized headphones around neck, standing behind DJ turntable mixing deck, neon club lights and laser beams, packed dance floor in background, cool confident expression, nightclub atmosphere, epic party vibes',
  },
  {
    id: 'fun-road-trip',
    label: 'Road Trip',
    description: 'Head out the car window, wind in fur',
    category: 'fun',
    prompt: 'head and paws sticking out of car window, wind blowing through fur, tongue out with pure joy, scenic highway and blue sky, sunglasses on head, road trip adventure, golden afternoon light, freedom and happiness',
    catPrompt: 'sitting regally in car passenger seat wearing tiny sunglasses, looking unimpressed out the window at passing scenery, scenic highway and blue sky, road trip adventure, golden afternoon light, aloof feline attitude',
  },
  {
    id: 'fun-yoga',
    label: 'Yoga & Spa',
    description: 'Zen mode with cucumber eye mask',
    category: 'fun',
    prompt: 'lying on spa massage table with cucumber slices on eyes, white fluffy robe and towel turban on head, scented candles and orchids around, zen relaxation, serene spa setting, soft ambient lighting, pure bliss expression',
  },
  {
    id: 'fun-office-worker',
    label: 'Office Worker',
    description: 'Corporate life at the desk',
    category: 'fun',
    prompt: 'sitting at office desk wearing glasses and tiny necktie, paws on keyboard, coffee mug beside monitor, stack of papers, motivational poster on wall, fluorescent office lighting, serious focused expression, corporate professional',
    catPrompt: 'sitting on office desk keyboard wearing glasses, knocking coffee mug to the edge with one paw, stack of papers scattered, monitor showing spreadsheet, fluorescent office lighting, deliberately mischievous expression, corporate chaos',
  },
  {
    id: 'fun-artist',
    label: 'Artist',
    description: 'Painting a masterpiece on canvas',
    category: 'fun',
    prompt: 'standing at easel holding paintbrush, wearing French beret and paint-splattered smock, colorful palette in paw, art studio with paintings on walls, warm creative lighting, passionate artistic expression, bohemian atmosphere',
  },
  {
    id: 'fun-astronaut',
    label: 'Astronaut',
    description: 'Floating in space with Earth below',
    category: 'fun',
    prompt: 'wearing full astronaut space suit with helmet visor open, floating weightless inside space station, Earth visible through window, control panels and equipment, dramatic space lighting, awe-struck expression, cosmic adventure',
  },
  {
    id: 'fun-graduation',
    label: 'Graduate',
    description: 'Graduation cap and diploma',
    category: 'fun',
    prompt: 'wearing graduation cap and tiny academic gown, proudly holding rolled diploma, confetti falling, university campus steps in background, family cheering, golden afternoon light, beaming with pride, milestone achievement',
  },
  {
    id: 'fun-rockstar',
    label: 'Rockstar',
    description: 'Shredding guitar on stage',
    category: 'fun',
    prompt: 'standing on concert stage playing electric guitar, wearing leather jacket and sunglasses, dramatic stage lighting with spotlights and smoke machine, adoring crowd with raised hands, rockstar power pose, epic performance moment',
  },
  {
    id: 'fun-knight',
    label: 'Medieval Knight',
    description: 'Suited up in shining armor',
    category: 'fun',
    prompt: 'wearing full medieval knight armor with shining silver breastplate and helmet with visor up, holding sword upright, standing in grand castle throne room, tapestries on stone walls, dramatic torchlight, noble heroic pose, chivalrous guardian',
    catPrompt: 'wearing full medieval knight armor with shining silver breastplate and helmet with visor up, perched regally on castle windowsill, grand throne room with tapestries on stone walls, dramatic torchlight, noble guardian of the realm, dignified feline warrior',
  },
];
