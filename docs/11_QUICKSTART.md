# <img src="../public/fav.png" width="35" height="35" style="vertical-align:middle;margin-right:-8px"/> AfriTube Quick Start Guide

> Get AfriTube running locally in under 10 minutes.

---

## Prerequisites

Make sure you have these installed:

- [Node.js](https://nodejs.org) v18 or higher
- [npm](https://npmjs.com) v9 or higher
- [Git](https://git-scm.com)
- A [Supabase](https://supabase.com) account (free tier works)

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/eodenyire/afritube.git
cd afritube
```

---

## Step 2 — Install Dependencies

```bash
npm install
```

---

## Step 3 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Project Settings → API**
3. Copy your **Project URL** and **anon public key**

---

## Step 4 — Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

## Step 5 — Run Database Migrations

In your Supabase dashboard, go to **SQL Editor** and run each migration file in order:

```
supabase/migrations/20260327183449_...sql   ← profiles, auth triggers
supabase/migrations/20260328052657_...sql   ← storage buckets, content tables
supabase/migrations/20260330153621_...sql   ← subscriptions
supabase/migrations/20260401041320_...sql   ← additional updates
supabase/migrations/20260401041442_...sql   ← additional updates
supabase/migrations/20260402040406_...sql   ← additional updates
supabase/migrations/20260402040554_...sql   ← additional updates
supabase/migrations/20260402120000_increment_streams_fn.sql  ← stream counter
```

Or if you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

```bash
supabase db push
```

---

## Step 6 — Disable Email Confirmation (for local dev)

In your Supabase dashboard:
1. Go to **Authentication → Providers → Email**
2. Toggle off **"Confirm email"**
3. Save

This lets you sign up and log in immediately without email verification.

---

## Step 7 — Start the Development Server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Step 8 — Create Your First Account

1. Click **Sign In** in the navbar
2. Click **Sign up**
3. Enter your email and password
4. You'll be logged in immediately

---

## Step 9 — Upload Your First Content

1. Click the upload icon in the navbar or go to `/upload`
2. Choose Video, Audio, or Blog tab
3. Fill in the details and upload

---

## Optional: Enable Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Add `https://your-project-id.supabase.co/auth/v1/callback` as redirect URI
4. In Supabase → Authentication → Providers → Google → paste Client ID & Secret
5. Add your app URL to Supabase → Authentication → URL Configuration → Redirect URLs

---

## Available Scripts

```bash
npm run dev        # Start development server (localhost:8080)
npm run build      # Build for production
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
npm run test       # Run tests (single run)
```

---

## Project Structure (Quick Reference)

```
src/
├── pages/       # Route-level page components
├── components/  # Reusable UI components
├── hooks/       # Custom React hooks
├── integrations/# Supabase client & types
└── assets/      # Static images
```

---

## Troubleshooting

**Blank page on startup**
- Check that `.env` variables are set correctly
- Make sure Tailwind v3 is installed: `npm install tailwindcss@^3.4.0 --save-dev`

**"Missing OAuth secret" error**
- Google OAuth needs to be configured in Supabase (see Step: Enable Google OAuth above)

**"Cannot find module 'caniuse-lite'"**
- Run: `npm install caniuse-lite browserslist --save-dev`

**Videos/audio show 0:00 duration**
- This affects content uploaded before the duration fix. New uploads will show correct duration automatically.
