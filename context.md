# Petpics - Development Context

## Last Updated: 2026-02-11

## Project Overview
AI Pet Photography SaaS. Users upload 5-20 photos of their pet, train a custom LoRA model via FAL.ai, then generate portraits in any scene/setting. Monetized via Stripe credit system.

## Production
- **App URL**: https://petpics.akoolai.com
- **Admin**: https://petpics.akoolai.com/admin
- **Email domain**: petpics-mail.com (Resend, sender: noreply@petpics-mail.com)
- **Deployment**: Vercel (auto-deploy from GitHub on push to main)
- **Repo**: github.com/zachwinky/petpics

## Tech Stack
- **Framework**: Next.js 16 + React 19 + TypeScript
- **Database**: PostgreSQL (Vercel Postgres)
- **Auth**: NextAuth.js (Google OAuth + Credentials)
- **Payments**: Stripe
- **AI**: FAL.ai (LoRA training via flux-lora-fast, generation via flux-lora)
- **Email**: Resend
- **Rate Limiting**: Vercel KV (Upstash Redis)
- **Styling**: Tailwind CSS 4

## Recent Changes (Feb 2026)

### Landing Page Conversion Overhaul
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

### Admin Resend Training Email
- `/api/admin/resend-training-email` — generates fresh watermarked samples and sends email
- Accepts `{ modelId }` or `{ userId, triggerWord }`
- Processes watermarks sequentially, returns URLs in response for debugging

### Email Domain Setup
- Switched from Resend sandbox (`onboarding@resend.dev`) to verified `petpics-mail.com`
- Updated all 4 `from` addresses in `lib/email.ts`
- No env var changes needed — domain is hardcoded in email templates

### Watermark Fix
- Fixed: was showing boxes instead of text (Sharp doesn't support CSS text-shadow)
- Solution: SVG stroke outline (two overlapping text elements)
- Made much larger: font size = width/5 (~200px on 1024px image)

### Sample Image Generation Fix
- Fixed wrong pets in training email samples
- Root cause: guidance_scale was 3.5 (too low for LoRA), bumped to 5.5
- Also increased image size to 1024x1024 and inference steps to 40
- Fixed in 3 files: train/route.ts, train/status/route.ts, pending-trainings/route.ts

### Super Bowl Prompts
- Added 4 themed presets: Game Day Jersey, Touchdown, Halftime Show, Champion
- Valentine's Day prompts already exist (Cupid, Rose Delivery, Chocolates, Balloons, Portrait)

## Key Admin Config Keys (admin_config table)
- `hero_gallery_images` — `[{ url: string, alt: string }]` for landing page gallery
- `sample_prompt_ids` — `string[]` (2 preset IDs for training completion email samples)

## Key Files
- `app/page.tsx` — Landing page layout
- `components/HeroGallery.tsx` — Auto-scrolling gallery (CSS animation)
- `components/HowItWorks.tsx` — 3-step process section
- `components/AdminDashboard.tsx` — Admin panel (stats, users, gallery mgmt, sample config)
- `lib/watermark.ts` — SVG watermark + FAL upload
- `lib/email.ts` — Email templates (Resend)
- `lib/presetPrompts.ts` — Scene presets (incl. seasonal themes)
- `lib/db.ts` — All DB operations + getAdminConfig/setAdminConfig
- `app/api/admin/resend-training-email/route.ts` — Resend training email
- `app/api/admin/gallery-config/route.ts` — Gallery image CRUD
- `app/api/gallery/route.ts` — Public gallery endpoint

## Known Considerations
- FAL storage URLs are semi-permanent but can expire — for gallery, use stable URLs
- 93% of traffic is mobile (Facebook ads) — always prioritize mobile UX
- Pet type (cat/dog) detected during upload, stored on model and pending_training
- Cat-specific prompts via `catPrompt` field in presetPrompts.ts
- Training emails include 3 watermarked sample images (preview + 2 admin-selected scenes)
