# Plan: Pet Photography Fork - Areas to Modify

## Overview
This plan documents all areas that need to be changed when forking the product photography codebase to create a pet photography app. The app currently focuses on "product photography" with language, prompts, and features tailored to products. For pets, we need to change terminology, scene presets, and some features.

---

## CRITICAL CHANGES (Must Change)

### 1. Landing Page & Headlines
**File:** [app/page.tsx](app/page.tsx)

Current:
```tsx
<h1 className="text-3xl md:text-5xl font-bold text-gray-900">
  AI Product Photography
</h1>
<p className="text-lg md:text-xl text-gray-600">
  Create stunning product photos in any setting - no photoshoot required
</p>
```

Change to:
```tsx
<h1 className="text-3xl md:text-5xl font-bold text-gray-900">
  AI Pet Photography
</h1>
<p className="text-lg md:text-xl text-gray-600">
  Create stunning pet photos in any setting - no photoshoot required
</p>
```

Also update:
- "Your Exact Product" → "Your Exact Pet"
- "The AI learns your specific product" → "The AI learns your specific pet"
- "Place your product anywhere" → "Place your pet anywhere"

### 2. Preset Prompts Library
**File:** [lib/presetPrompts.ts](lib/presetPrompts.ts)

Current prompts are product-focused (kitchen counter, wooden table, studio white). For pets, replace with:

```typescript
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
];
```

### 3. Email Templates
**File:** [lib/email.ts](lib/email.ts)

Lines to change:
- Line 31: "Thanks for signing up! To get started with creating stunning AI product photos" → "...AI pet photos"
- Line 99: "You can now generate unlimited product photos" → "...pet photos"
- Line 110: "Tip: Try different prompts and settings to get the best results for your product photography!" → "...pet photography!"
- Line 170: Training failure tips currently mention "product" - change to pet-specific tips:

```typescript
<ul style="font-size: 14px; color: #666;">
  <li>High-resolution images (at least 512x512 pixels)</li>
  <li>Well-lit photos with clear focus on your pet</li>
  <li>Multiple angles and expressions of your pet</li>
  <li>5-20 images for training</li>
</ul>
```

### 4. Training/Generation API Routes

**Files to update:**
- [app/api/train/status/route.ts](app/api/train/status/route.ts:25)
- [app/api/generate-preview/route.ts](app/api/generate-preview/route.ts:53)
- [app/api/batch-generate/route.ts](app/api/batch-generate/route.ts)
- [app/api/flux-generate/route.ts](app/api/flux-generate/route.ts)
- [app/api/reroll-generation/route.ts](app/api/reroll-generation/route.ts)
- [app/api/upscale-row/route.ts](app/api/upscale-row/route.ts)

Current: `prompt: 'Professional product photography of ${triggerWord}, ...'`

Change to: `prompt: 'Professional pet photography of ${triggerWord}, ...'`

Examples:
```typescript
// app/api/train/status/route.ts:25
prompt: `Professional pet photography of ${triggerWord}, clean background, professional lighting, high quality, detailed, portrait photography`,

// app/api/generate-preview/route.ts:53
prompt: `Professional pet photography of ${triggerWord}, clean background, professional lighting, high quality, detailed`,
```

### 5. ImageUpload Component
**File:** [components/ImageUpload.tsx](components/ImageUpload.tsx)

Lines to change:
- Line 142: `MAX_FILES = 20; // Maximum number of product images`
  → `MAX_FILES = 20; // Maximum number of pet images`

- Line 364: `'Please enter a unique product name'`
  → `'Please enter a unique pet name'`

- Line 370-371: `'Product name must be at least 2 characters'`
  → `'Pet name must be at least 2 characters'`

- Line 472: `'Failed to train photo subject'` (can stay as-is, but consider "photo pet" or just "pet")

- Line 589: `'professional product photoshoot, studio lighting, elegant background'`
  → `'professional pet photoshoot, natural lighting, beautiful background'`

- Line 608: `'No trained photo subject found. Please train a photo subject first.'`
  → `'No trained pet found. Please train your pet first.'`

- Line 619: `'professional product photoshoot, studio lighting, elegant background'`
  → `'professional pet photoshoot, natural lighting, beautiful background'`

- Line 699: `<strong>Product Name:</strong>`
  → `<strong>Pet Name:</strong>`

- Line 807: `'Custom AI: Upload 5-20 images of your product'`
  → `'Custom AI: Upload 5-20 images of your pet'`

- Line 858: `alt={Product ${index + 1}}`
  → `alt={Pet ${index + 1}}`

- Line 886: `'What should we call this product?'`
  → `'What should we call this pet?'`

- Line 897: `placeholder="e.g., MYBOTTLE, REDMUG, GOLDEARRINGS"`
  → `placeholder="e.g., FLUFFY, MAXTHEDOG, WHISKERS"`

- Line 903: `'A short nickname to identify your product'`
  → `'A short nickname to identify your pet'`

- Line 922: `'Upload at least 5 images to train your custom AI'`
  → (can stay as-is or specify "5 images of your pet")

- Line 925: `'Please enter a unique product name'`
  → `'Please enter a unique pet name'`

- Line 1026: `'Your photo subject...is now ready to generate professional product photos!'`
  → `'...professional pet photos!'`

- Line 1057: `'Train New Product'`
  → `'Train New Pet'`

- Line 1060: `'Product name:'`
  → `'Pet name:'`

- Line 1113: `'Professional product photography of ${triggerWord}'`
  → `'Professional pet photography of ${triggerWord}'`

### 6. Training API
**File:** [app/api/train/route.ts](app/api/train/route.ts)

Search for "product" and replace appropriately. Key areas:
- Comments about product training
- Any validation messages

---

## FEATURES TO REMOVE/MODIFY

### 7. AnalyzeProductButton Component
**File:** [components/AnalyzeProductButton.tsx](components/AnalyzeProductButton.tsx)

**Decision needed:** This feature analyzes text on products (like logos/labels). For pets, this doesn't make sense.

**Options:**
- **A) Remove entirely** - Delete the component and its usage in [app/dashboard/subjects/\[id\]/page.tsx](app/dashboard/subjects/[id]/page.tsx:112)
- **B) Repurpose** - Change to "Analyze Pet Features" that describes breed, color, markings (would need new API backend)
- **C) Keep but rename** - Keep functionality but rename to "Analyze Image Details" (less confusing)

**Recommended:** Remove entirely (Option A)

### 8. API Route for Product Analysis
**File:** `app/api/analyze-product/route.ts`

If removing AnalyzeProductButton, also delete this API route.

---

## TERMINOLOGY CHANGES

### 9. Database & Model Names
**File:** [app/api/train/route.ts](app/api/train/route.ts), [app/api/train/status/route.ts](app/api/train/status/route.ts:148)

Current: `const modelName = Photo Subject ${triggerWord};`

Consider changing to: `const modelName = Pet ${triggerWord};`

### 10. UI Copy Throughout App

**Files to search and replace "product" → "pet":**
- [components/GenerateInterface.tsx](components/GenerateInterface.tsx)
- [components/ModelCard.tsx](components/ModelCard.tsx)
- [components/ModelSelector.tsx](components/ModelSelector.tsx)
- [app/generate/page.tsx](app/generate/page.tsx)
- [app/dashboard/page.tsx](app/dashboard/page.tsx)

**Terms to change:**
- "Generate product photos" → "Generate pet photos"
- "Product images" → "Pet images"
- "Your products" → "Your pets"
- "Product photography" → "Pet photography"

### 11. Photo Tips & Guidelines
**File:** `components/PhotoGuide.tsx` (if exists)

Update photo-taking tips for pets:
- Current: Focus on product lighting, angles, clean backgrounds
- Pets: Focus on pet attention, natural lighting, capturing personality, multiple expressions

**File:** [components/CameraCapture.tsx](components/CameraCapture.tsx)

Photo guidelines overlay should mention:
- "Get your pet's attention"
- "Natural lighting works best"
- "Capture different angles and expressions"

---

## OPTIONAL ENHANCEMENTS (Pet-Specific)

### 12. Pet-Specific Prompts in Generation
Consider adding pet-specific prompt modifiers:
- "looking at camera"
- "tongue out"
- "sitting"
- "running"
- "playful expression"

### 13. Training Tips Modal
Add pet-specific training tips:
- Photos of your pet in different poses
- Close-ups and full body shots
- Different lighting conditions
- Different backgrounds to improve versatility

---

## BRANDING & ENVIRONMENT

### 14. Environment Variables
**File:** `.env.local` or similar

- `NEXT_PUBLIC_APP_URL` - Update to pet app domain
- Email sender name in Resend config

### 15. Site Metadata
**File:** [app/layout.tsx](app/layout.tsx)

Update:
- Title: "Akoolai" → "PetPhoto AI" (or your pet brand)
- Description: Product photography → Pet photography
- OG images, favicons, etc.

### 16. Package Name & README
**File:** `package.json`, `README.md`

Update project name and description.

---

## TESTING CHECKLIST

After making changes, test:
1. ✅ Landing page copy reflects pet photography
2. ✅ Training flow uses pet terminology
3. ✅ Email templates mention pets, not products
4. ✅ Preset prompts are pet-appropriate (park, beach, etc.)
5. ✅ Generation prompts produce pet photos, not product photos
6. ✅ All user-facing text says "pet" not "product"
7. ✅ AnalyzeProductButton removed (or repurposed)
8. ✅ Photo upload tips are pet-specific

---

## SUMMARY TABLE

| Category | Files to Change | Priority |
|----------|----------------|----------|
| Landing page | app/page.tsx | HIGH |
| Preset prompts | lib/presetPrompts.ts | HIGH |
| Email templates | lib/email.ts | HIGH |
| API prompts | All route.ts files in api/ | HIGH |
| ImageUpload copy | components/ImageUpload.tsx | HIGH |
| Training UI | components/ImageUpload.tsx, app/api/train/route.ts | HIGH |
| AnalyzeProduct feature | components/AnalyzeProductButton.tsx, api/analyze-product | MEDIUM (Remove) |
| Photo guidelines | components/CameraCapture.tsx, PhotoGuide.tsx | MEDIUM |
| Branding | app/layout.tsx, package.json | MEDIUM |
| General UI copy | All components/*.tsx | LOW (Search & replace) |

---

## SEARCH PATTERNS

Use these search patterns to find remaining "product" references:

```bash
# Case-insensitive search for "product"
grep -ri "product" --include="*.tsx" --include="*.ts" app/ components/ lib/

# Search for "product photography"
grep -ri "product photography" --include="*.tsx" --include="*.ts" .

# Search for specific product terms
grep -ri "your product" --include="*.tsx" --include="*.ts" .
```

---

## IMPLEMENTATION APPROACH

**Recommended workflow:**
1. Create a new branch from main: `git checkout -b pet-photography-fork`
2. Start with HIGH priority changes (landing page, prompts, emails, API prompts)
3. Test core flow: training → generation → dashboard
4. Implement MEDIUM priority changes (remove AnalyzeProduct, photo guidelines)
5. Global search/replace for remaining "product" mentions
6. Update branding and metadata
7. Full QA test of entire app
8. Deploy as separate app with new domain

This ensures core functionality works first before polishing copy throughout the entire app.
