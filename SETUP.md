# Setup Guide

## Phase 2: Database & Auth Setup

### 1. Set up Vercel Postgres Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your `akoolai-generator` project
3. Go to the **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Choose a name (e.g., `akoolai-db`)
7. Select a region (choose closest to your users)
8. Click **Create**

### 2. Get Database Connection Strings

After creating the database:

1. Click on your new database
2. Go to the **`.env.local`** tab
3. Copy all the `POSTGRES_*` environment variables
4. Add them to your local `.env.local` file

### 3. Initialize Database Schema

Run the initialization script:

```bash
npx tsx scripts/init-db.ts
```

This will create all the necessary tables (users, models, generations, transactions, training_images).

### 4. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://akoolai-generator.vercel.app/api/auth/callback/google` (production)
7. Copy the **Client ID** and **Client Secret**
8. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

### 5. Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Add to `.env.local`:
```
NEXTAUTH_SECRET=generated_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 6. Update Vercel Environment Variables

Go to your Vercel project settings:

1. **Settings** → **Environment Variables**
2. Add all the new environment variables:
   - All `POSTGRES_*` variables (auto-added when you created the database)
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (set to `https://akoolai-generator.vercel.app`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

### 7. Deploy Database Schema to Production

You have two options:

**Option A: Via Vercel Dashboard**
1. Go to Storage → Your Database → Query tab
2. Copy contents of `db/schema.sql`
3. Paste and run each CREATE TABLE statement

**Option B: Via Vercel CLI** (recommended)
```bash
vercel env pull .env.production
npx tsx scripts/init-db.ts
```

## Next Steps

Once Phase 2 setup is complete:
- Test authentication (Google login)
- Verify database tables are created
- Ready for Phase 3: Credits & Payment System
