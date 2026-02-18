# Petpics - Development Context

## Last Updated: 2026-02-17

## Project Overview
AI Pet Photography SaaS. Users upload 5-20 photos of their pet, train a custom LoRA model via FAL.ai, then generate portraits in any scene/setting. Monetized via Stripe credit system.

## Production
- **App URL**: https://petpics.akoolai.com
- **Admin**: https://petpics.akoolai.com/admin
- **Email domain**: petpics-mail.com (Resend, sender: noreply@petpics-mail.com)
- **Deployment**: Vercel (auto-deploy from GitHub on push to main)
- **Repo**: github.com/zachwinky/petpics
- **Meta Pixel ID**: 25793238440302657

## Tech Stack
- **Framework**: Next.js 16 + React 19 + TypeScript
- **Database**: PostgreSQL (Vercel Postgres)
- **Auth**: NextAuth.js (Google OAuth + Credentials)
- **Payments**: Stripe (API version 2025-12-15.clover)
- **AI**: FAL.ai (LoRA training via flux-lora-fast, generation via flux-lora)
- **Email**: Resend (4 email types: verification, training complete, training complete w/ images, training failed)
- **Rate Limiting**: Vercel KV (Upstash Redis)
- **Styling**: Tailwind CSS 4
- **Tracking**: Meta Pixel + Vercel Analytics

## Recent Changes (Feb 2026)

### Watermark Fix (Feb 17)
- SVG text rendering fails on Vercel serverless (librsvg renders tiny/invisible, no system fonts)
- Embedded base64 PNG tiles cause `libpng read error` on Vercel
- **Solution**: Pixel-font rendering — each letter (P,E,T,I,C,S) defined as a 5x7 binary grid
- Raw RGBA bytes written into Buffer, converted to PNG via `sharp({ raw })`
- White text at ~59% opacity, tiled in staggered brick pattern
- Zero dependencies on fonts, SVG, or PNG decoding — works identically everywhere

### Email Error Surfacing (Feb 17)
- `sendTrainingCompleteEmailWithImages` was silently swallowing Resend API errors
- Now checks `result.error` and throws, letting callers handle/surface errors
- `resend-training-email` route catches and returns email errors in API response
- Added `maxDuration = 300` to resend-training-email route

### Presidents' Day Prompts (Feb 17)
- Added 4 themed presets: Oval Office, Mount Rushmore, Crossing the Delaware, Lincoln Memorial

### Training Timeout Fix (Feb 17)
- Fixed stuck training detection timeout logic
- FAL auto-retries with NEW request IDs on 503 errors
- `/api/admin/recover-training` endpoint accepts correct FAL request ID to recover

### Landing Page Conversion Overhaul (Feb ~11)
- Removed WelcomeModal (3-slide onboarding carousel) — was causing 91% bounce rate
- New page flow: Hero headline → Auto-scrolling gallery → CTA → How It Works → Features
- `HeroGallery.tsx`: Continuous CSS animation carousel on mobile, 3-col grid on desktop
- `HowItWorks.tsx`: 3-step visual section (Upload → Train → Generate)
- Gallery images managed via admin dashboard → stored in `admin_config` table
- Mobile CTA positioned right after gallery (93% traffic is mobile from Facebook ads)
- Headline: "Turn Your Pet Into a Work of Art"

### Admin Gallery Manager
- Admin dashboard has "Landing Page Gallery" section
- Paste image URL + description, reorder with up/down, remove
- Saved to `admin_config` (key: `hero_gallery_images`)
- Served via public `/api/gallery` endpoint
- Admin config API: `/api/admin/gallery-config` (GET/POST)

### Sample Image Generation Fix
- Fixed wrong pets in training email samples
- Root cause: guidance_scale was 3.5 (too low for LoRA), bumped to 5.5
- Also increased image size to 1024x1024 and inference steps to 40
- Fixed in 3 files: train/route.ts, train/status/route.ts, pending-trainings/route.ts

### Super Bowl Prompts
- Added 4 themed presets: Game Day Jersey, Touchdown, Halftime Show, Champion

### Valentine's Day Prompts
- 5 presets: Cupid, Rose Delivery, Chocolates, Heart Balloons, Be My Valentine

## Key Admin Config Keys (admin_config table)
- `hero_gallery_images` — `[{ url: string, alt: string }]` for landing page gallery
- `sample_prompt_ids` — `string[]` (2 preset IDs for training completion email samples)

## Key Files
- `app/page.tsx` — Landing page layout (server component)
- `app/layout.tsx` — Root layout (Meta Pixel, Analytics, AuthModalProvider)
- `components/HeroGallery.tsx` — Auto-scrolling gallery (CSS animation)
- `components/HowItWorks.tsx` — 3-step process section
- `components/AdminDashboard.tsx` — Admin panel (stats, users, gallery mgmt, sample config)
- `components/FrameBuilder/` — Multi-image frame builder (layouts, styles, canvas rendering)
- `components/videos/` — Video generation components
- `lib/watermark.ts` — Pixel-font watermark (raw RGBA buffers + sharp)
- `lib/email.ts` — Email templates (Resend, 4 types)
- `lib/presetPrompts.ts` — 28 scene presets (standard + seasonal themes)
- `lib/videoPresets.ts` — 5 video motion presets
- `lib/frameStorage.ts` — localStorage helpers for saved frames
- `lib/db.ts` — All DB operations + getAdminConfig/setAdminConfig
- `app/api/admin/resend-training-email/route.ts` — Resend training email (maxDuration=300)
- `app/api/admin/recover-training/route.ts` — Recover lost FAL trainings
- `app/api/admin/gallery-config/route.ts` — Gallery image CRUD
- `app/api/gallery/route.ts` — Public gallery endpoint
- `app/api/pending-trainings/route.ts` — Training status polling (maxDuration=300)

## Vercel Serverless Constraints
- No system fonts installed (any font-dependent rendering fails)
- librsvg renders SVG text at wrong size vs local environment
- Memory limited: avoid large intermediate RGBA canvases (keep under ~16MB)
- `maxDuration` required on long-running routes (default timeout = 10-60s)
- Current maxDuration routes: train (300), pending-trainings (300), resend-training-email (300), videos/generate (60)

## Known Considerations
- FAL storage URLs are semi-permanent but can expire — for gallery, use stable URLs
- 93% of traffic is mobile (Facebook ads) — always prioritize mobile UX
- Pet type (cat/dog) detected during upload, stored on model and pending_training
- Cat-specific prompts via `catPrompt` field in presetPrompts.ts
- Training emails include 3 watermarked sample images (preview + 2 admin-selected scenes)
- FAL auto-retries with NEW request IDs on 503 errors — use recover-training endpoint
- All watermark callers return `null` (not original URL) on failure to prevent unwatermarked images
- `sendTrainingCompleteEmailWithImages` propagates errors (no silent swallowing)
- Other email functions (verification, training failed) still swallow errors silently
