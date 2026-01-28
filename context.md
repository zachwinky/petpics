# Akoolai Generator - Development Context

## Recent Session Summary (2026-01-19)

This document provides context for continuing development of the Akoolai AI product photography application.

## Latest Session: Security & Admin Dashboard

### 1. DNS & Authentication Fix (Continuation from Previous Session)
**Issue**: OAuth callbacks were failing with 404 errors

**Root Cause**:
- `www.akoolai.com` pointed to Wix servers (DNS: `cdn1.wixdns.net`)
- `studio.akoolai.com` pointed to Vercel (correct)
- User wanted main site on Wix, app on studio subdomain

**Solution**:
- Updated all environment variables to use `https://studio.akoolai.com`
- Fixed environment variable newline issue (switched from `echo` to `printf`)
- Updated Google OAuth settings to use studio subdomain

**Environment Variables** (Production):
```
AUTH_URL=https://studio.akoolai.com
NEXTAUTH_URL=https://studio.akoolai.com
NEXT_PUBLIC_APP_URL=https://studio.akoolai.com
```

**Files Modified**:
- `lib/auth.ts` - Added debug logging, improved redirect callback
- `app/api/auth/[...nextauth]/route.ts` - Explicit handler exports

### 2. Security Audit & Rate Limiting Upgrade
**User Request**: "I'm concerned that my api keys are exposed to anyone that might want to get to them. How can we ensure that they're secure?"

**Security Audit Results**:
✅ **Good Practices Already in Place**:
- All API keys (FAL_KEY, PEBBLELY_API_KEY, STRIPE_SECRET_KEY) stored in environment variables
- No keys exposed in client-side code (verified via grep)
- All sensitive endpoints require authentication
- Credit system prevents abuse
- Rate limiting implemented

⚠️ **Critical Issue Found**: In-memory rate limiting resets on deployment

**Solution**: Upgraded to Vercel KV (Upstash Redis)

**Implementation**:
- Installed `@vercel/kv` package
- Rewrote `lib/rateLimit.ts` to use Redis instead of in-memory storage
- Updated all API routes to use async rate limiter
- Created Vercel KV database in dashboard
- Automatic environment variables: `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`

**Rate Limits**:
- Training API: 2 requests/hour per IP (expensive operation)
- FLUX Generation: 10 requests/minute per IP
- Legacy Generation: 5 requests/minute per IP
- Per-endpoint tracking with automatic TTL expiration

**Files Modified**:
- `lib/rateLimit.ts` - Complete rewrite for Redis
- `app/api/train/route.ts` - Added `await` to rateLimit call
- `app/api/flux-generate/route.ts` - Added `await` to rateLimit call
- `app/api/generate/route.ts` - Added `await` to rateLimit call

**Commit**: `0ea12d3` - "Security: Upgrade rate limiting to persistent Redis storage"

### 3. Admin Dashboard Implementation
**User Request**: "Can we work on a little admin dashboard so I can view users, credits, spend, etc?"

**Implementation**: Comprehensive admin system with role-based access

**Admin Authentication**:
- Email-based admin control via `ADMIN_EMAILS` environment variable
- Production admin: `zach@akoolai.com`
- Non-admin users automatically redirected from admin routes

**Admin Dashboard Features** (`/admin`):

**Key Metrics Cards**:
- Total users + signups last 7 days
- Total revenue + revenue last 30 days
- Credits issued vs. spent
- Total models + generations

**Sortable User Table**:
- Click column headers to sort by: Join Date, Credits Balance, Total Spent
- Shows: Email, name, credits, activity stats, last activity
- "View Details" link for each user

**User Detail Pages** (`/admin/users/[id]`):
- User overview (email, name, join date, credit balance)
- Activity stats (models trained, generations, total spent/purchased)
- Manual credit adjustment with description
- Model list with training details
- Recent generations with credit usage
- Complete transaction history

**Admin Navigation**:
- Orange "Admin" link in navbar (only visible to admins)
- Positioned between "Dashboard" and user menu

**Files Created**:
- `lib/admin.ts` - Admin utilities and database queries
  - `isAdmin()` - Check if email has admin access
  - `getAdminStats()` - Overall platform statistics
  - `getAllUsers()` - Paginated user list with sorting
  - `getUserDetail()` - Full user details with transactions/models/generations
  - `addCreditsToUser()` - Manual credit adjustment
- `app/admin/page.tsx` - Main admin dashboard page
- `app/admin/users/[id]/page.tsx` - User detail page
- `app/api/admin/stats/route.ts` - API for admin stats and user list
- `app/api/admin/users/[id]/route.ts` - API for user details and actions (GET, POST)
- `components/AdminDashboard.tsx` - Client component for main dashboard
- `components/UserDetailView.tsx` - Client component for user details

**Files Modified**:
- `components/Navbar.tsx` - Added `isAdmin` prop and admin link
- `components/NavbarWrapper.tsx` - Added admin check using `isAdmin(user.email)`

**Environment Variables**:
```
ADMIN_EMAILS=zach@akoolai.com
```

**Commits**:
- `6b7fa53` - "Feature: Add comprehensive admin dashboard"
- `9da6318` - "Fix: Add optional chaining for admin check in Navbar"

### 4. Current Status
**Known Issue**: Application error on production (client-side exception)
- Deployed admin dashboard successfully
- Error appears to be client-side (hydration mismatch suspected)
- Applied fix: Added optional chaining (`user?.isAdmin`) in Navbar.tsx
- Awaiting verification on other machine

**Production URLs**:
- Main app: `https://studio.akoolai.com`
- Admin dashboard: `https://studio.akoolai.com/admin`
- Main site (Wix): `https://www.akoolai.com` or `https://akoolai.com`

## Tech Stack

- **Framework**: Next.js 16.1.1 with App Router and Turbopack
- **Auth**: NextAuth v5 (beta.30) with Credentials and Google OAuth providers
- **Database**: PostgreSQL with raw SQL queries (no ORM)
- **Email**: Resend (onboarding@resend.dev for dev/test)
- **Payments**: Stripe
- **AI Services**:
  - FAL AI for FLUX model training and generation
  - Pebblely for background generation
- **Rate Limiting**: Vercel KV (Upstash Redis) - persistent across deployments
- **Deployment**: Vercel
- **Storage**: Files sync via OneDrive

## Key Features Implemented

1. **Email Verification System**
   - Token-based verification with 24-hour expiration
   - Auto-verification for Google OAuth users
   - Resend integration for emails

2. **Mobile Responsive Design**
   - Responsive headers (text-2xl md:text-4xl)
   - Compact navbar for mobile (hides credits label, dashboard link, user details)
   - Auth pages optimized for mobile

3. **Model Training & Generation**
   - FLUX-based custom AI model training (10 credits)
   - Generate photos (4 images = 1 credit, 12 images = 3 credits, 20 images = 4 credits)
   - Batch generation with multi-scene support
   - Preset prompts for different scenes
   - Model storage and reuse
   - Preview generation (free)

4. **Dashboard**
   - View trained models with preview images
   - Add/edit notes on models
   - Delete models with confirmation
   - Generate photos from models
   - View generation history

5. **Credit System**
   - Stripe integration for credit purchases
   - Credit tracking per user
   - Transaction history
   - Different costs for training vs generation
   - Admin credit adjustment

6. **Security**
   - API keys secured server-side only
   - Authentication required for all sensitive endpoints
   - Persistent rate limiting via Redis
   - Per-endpoint rate limits
   - Graceful fallback if Redis unavailable

7. **Admin Dashboard**
   - Platform-wide statistics
   - User management and search
   - Transaction monitoring
   - Manual credit adjustments
   - User activity tracking

## Database Schema (Key Tables)

**users**
- id, email, name, password_hash, google_id
- credits_balance (integer)
- email_verified, email_verification_token, email_verification_expires
- created_at, updated_at

**models**
- id, user_id, name, lora_url, trigger_word
- training_images_count
- notes (TEXT)
- preview_image_url (TEXT)
- created_at

**generations**
- id, user_id, model_id, preset_prompt_id, custom_prompt
- image_urls (TEXT[] array)
- credits_used (integer)
- created_at

**transactions**
- id, user_id, type ('purchase' | 'training' | 'generation')
- credits_change (integer - positive for purchase, negative for usage)
- credits_balance_after (integer)
- amount_usd (numeric)
- stripe_payment_id (text)
- description (text)
- created_at

**training_images**
- id, model_id, image_url
- created_at

## Environment Variables Required

**Production** (All set in Vercel):
```
# Database
POSTGRES_URL=postgres://...

# Authentication
AUTH_URL=https://studio.akoolai.com
NEXTAUTH_URL=https://studio.akoolai.com
NEXT_PUBLIC_APP_URL=https://studio.akoolai.com
AUTH_SECRET=...
NEXTAUTH_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email
RESEND_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# AI Services
FAL_KEY=...
PEBBLELY_API_KEY=...

# Admin
ADMIN_EMAILS=zach@akoolai.com

# Vercel KV (Auto-configured by Vercel)
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

## Recent Git Commits (Most Recent First)

1. `9da6318` - Fix: Add optional chaining for admin check in Navbar
2. `6b7fa53` - Feature: Add comprehensive admin dashboard
3. `0ea12d3` - Security: Upgrade rate limiting to persistent Redis storage
4. `83c68c3` - Fix: Explicitly export NextAuth handlers
5. `4dc4746` - Debug: Add logging to auth config and remove basePath
6. (Previous session commits...)

## Development Workflow

**To run locally**:
```bash
npm install
npm run dev
```

**To build**:
```bash
npm run build
```

**To deploy to Vercel**:
```bash
npx vercel --prod
```

**To manage environment variables**:
```bash
# Add variable
printf "value" | npx vercel env add VAR_NAME production

# Remove variable
npx vercel env rm VAR_NAME production --yes

# List variables
npx vercel env ls
```

**No Git Remote**: Project uses Vercel CLI for deployment, not git push. Files sync via OneDrive.

## Known Issues & Considerations

- **Client-Side Error**: Current production deployment shows application error (investigating hydration mismatch)
- **DNS Setup**: Main domain (www.akoolai.com) on Wix, app on studio.akoolai.com subdomain
- **Next.js 16**: Requires async params pattern for dynamic routes
- **OneDrive Sync**: When switching machines, wait for sync to complete before running `npm install`
- **Resend Email**: Currently using test domain (onboarding@resend.dev), should update to custom domain in production
- **Rate Limiting**: Now persistent via Redis - survives deployments
- **Admin Access**: Controlled via ADMIN_EMAILS environment variable (comma-separated list)

## Key Design Patterns

1. **Server Components by default**, Client Components only when needed (use state, interactivity)
2. **Raw SQL queries** via pg Pool instead of ORM
3. **Responsive design** with Tailwind `md:` breakpoints
4. **Client-side state management** for interactive features (useState, not external library)
5. **Cascading deletes** via database transactions
6. **Token-based verification** for email (crypto.randomBytes)
7. **Rate limiting** with Redis for persistence across deployments
8. **Role-based access control** via environment variables

## Important File Locations

- **Auth**: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`
- **Database**: `lib/db.ts` (all database functions)
- **Admin**: `lib/admin.ts` (admin utilities and queries)
- **Rate Limiting**: `lib/rateLimit.ts` (Redis-based)
- **Email**: `lib/email.ts`
- **API Routes**: `app/api/*`
- **Admin Routes**: `app/api/admin/*`, `app/admin/*`
- **Components**: `components/*`
- **Styles**: `app/globals.css` (global styles), Tailwind inline
- **Migrations**: `scripts/*.sql` and `scripts/migrate-*.ts`

## Production URLs

- **App**: https://studio.akoolai.com
- **Admin Dashboard**: https://studio.akoolai.com/admin
- **Main Site (Wix)**: https://www.akoolai.com / https://akoolai.com

## Security Best Practices

1. **API Keys**: Never expose in client code - always use server-side only
2. **Rate Limiting**: Persistent Redis storage prevents bypass via deployments
3. **Authentication**: All sensitive endpoints check session
4. **Authorization**: Admin routes check email against ADMIN_EMAILS
5. **Credits**: Deducted before operations, refunded on failure
6. **Input Validation**: File sizes, prompt lengths, image counts validated
7. **Fail-Safe**: Rate limiter fails open if Redis unavailable (prevents total outage)

## Admin Dashboard Guide

**Access**: Sign in with admin email (`zach@akoolai.com`) and visit `/admin`

**Adding More Admins**:
```bash
printf "zach@akoolai.com,other@email.com" | npx vercel env add ADMIN_EMAILS production
```

**Features**:
- Platform statistics dashboard
- Sortable user table (click column headers)
- Individual user details with full transaction history
- Manual credit adjustment capability
- View user models and generations

## Notes for Next Session

- **Investigate Client Error**: Application error on production needs debugging
  - Likely hydration mismatch or date formatting issue
  - Check browser console for specific error
  - Optional chaining fix deployed but needs verification
- **Security Hardened**: Redis rate limiting now prevents API abuse
- **Admin Dashboard**: Fully functional for user/revenue monitoring
- **DNS Configuration**: studio.akoolai.com properly configured for app
- All placeholder text now globally styled - no need to add classes
- All buttons now have cursor-pointer globally - no need to add classes
- Rate limiting persists across deployments via Vercel KV
