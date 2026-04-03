# AfriTube Mobile

React Native + Expo mobile app for AfriTube — Android, iOS, and Smart TV.

## Setup

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Fill in your Supabase URL and anon key

# Start dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android APK
npm run build:android

# Build iOS IPA
npm run build:ios
```

## Project Structure

```
app/
├── (tabs)/
│   ├── index.tsx      # Home screen
│   ├── music.tsx      # Music/audio screen
│   ├── blogs.tsx      # Blog posts screen
│   └── dashboard.tsx  # Creator dashboard
├── auth.tsx           # Login/signup
├── watch/[id].tsx     # Video player
├── search.tsx         # Search
└── _layout.tsx        # Root layout

components/
├── VideoCard.tsx
├── AudioCard.tsx
└── SectionHeader.tsx

lib/
└── supabase.ts        # Supabase client

hooks/
└── useAuth.ts         # Auth hook

constants/
└── theme.ts           # Colors, fonts, spacing
```

## Same Backend

This app connects to the same Supabase project as the web app.
No backend changes needed — just set the same env variables.
