# AfriTube Mobile — Screenshots

Step-by-step visual walkthrough of the AfriTube mobile app (React Native + Expo).
All screens use the app's dark gold theme (`#0f0b08` background, `#e8920a` primary).

---

## App Flow

### Authentication

| # | File | Screen | Description |
|---|------|--------|-------------|
| 1 | `01-auth-login.svg` | **Login** | Entry point for returning users. Shows the AfriTube logo, email + password fields, and a gold "Sign In" button. Links to Forgot Password and Sign Up. |
| 2 | `02-auth-signup.svg` | **Sign Up** | New user registration. Adds a Display Name field above Email and Password. "Create Account" submits to Supabase Auth. |
| 3 | `03-auth-forgot-password.svg` | **Forgot Password** | Password reset flow. Accepts email and sends a reset link via Supabase. |

---

### Main App (Tab Navigator)

| # | File | Screen | Description |
|---|------|--------|-------------|
| 4 | `04-home-screen.svg` | **Home** | Landing screen after login. Features a search bar, hero banner ("Watch. Listen. Create."), category filter pills (Trending, Music, Comedy…), a vertical list of video cards, and a horizontal row of audio cards. |
| 5 | `05-search-empty.svg` | **Search — Empty State** | Search screen before a query is entered. Displays a large search icon with "Search AfriTube" prompt and subtitle. |
| 6 | `06-search-results.svg` | **Search — Results** | After typing and submitting a query. Shows a scrollable list of matching video cards with thumbnails, title, channel, and view count. |
| 7 | `07-music-screen.svg` | **Music** | Dedicated music tab. Displays published audio tracks in a 2-column grid. Each card shows cover art, track title, artist name, and stream count. |
| 8 | `08-blogs-screen.svg` | **Blogs** | "Featured Stories" feed. Each blog card shows a cover image, a category badge, post title, excerpt, author name, and like count. |

---

### Video Playback

| # | File | Screen | Description |
|---|------|--------|-------------|
| 9 | `09-watch-video-player.svg` | **Watch / Video Player** | Full video playback screen. 16:9 player at the top with a progress bar. Below: video title, view count + category, Like / Share / Save actions, creator row with Subscribe button, and a description card. |

---

### Creator Dashboard

| # | File | Screen | Description |
|---|------|--------|-------------|
| 10 | `10-dashboard-signed-out.svg` | **Dashboard — Guest** | Shown when the user is not logged in. Displays a person icon, a pitch to sign in, and a gold "Sign In" CTA button. |
| 11 | `11-dashboard-signed-in.svg` | **Dashboard — Creator** | Shown after sign-in. Displays the creator's avatar initial, display name, email, and an optional "MONETIZED" badge. Stats cards for Subscribers and Watch Hours. Progress bars toward monetization thresholds (100 subs / 1,000 watch hours). Quick-action button to upload content. |

---

## Color Reference

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#0f0b08` | App background |
| `card` | `#1a1410` | Card surfaces |
| `primary` | `#e8920a` | Buttons, accents, active state |
| `primaryForeground` | `#0f0b08` | Text on primary buttons |
| `foreground` | `#f0e8d8` | Main body text |
| `mutedForeground` | `#8a7a6a` | Secondary / placeholder text |
| `secondary` | `#2a2018` | Input fields, pills |
| `coral` | `#e05a2a` | Like / heart icon (active) |

---

## Navigation Structure

```
app/
├── auth.tsx              → Screens 1–3 (Login / Sign Up / Forgot)
├── (tabs)/
│   ├── index.tsx         → Screen 4  (Home)
│   ├── music.tsx         → Screen 7  (Music)
│   ├── blogs.tsx         → Screen 8  (Blogs)
│   └── dashboard.tsx     → Screens 10–11 (Dashboard)
├── search.tsx            → Screens 5–6  (Search)
└── watch/[id].tsx        → Screen 9  (Video Player)
```
