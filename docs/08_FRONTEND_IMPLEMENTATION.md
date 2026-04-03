# <img src="../public/fav.png" width="35" height="35" style="vertical-align:middle;margin-right:-8px"/> AfriTube Frontend Implementation

---

## 1. Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool & dev server |
| Tailwind CSS | 3.4.x | Utility-first styling |
| shadcn/ui | latest | Component library (Radix UI based) |
| Framer Motion | 11.x | Animations |
| React Router DOM | 6.30.1 | Client-side routing |
| TanStack Query | 5.83.0 | Server state management |
| Supabase JS | 2.100.1 | Backend client |
| Sonner | 1.7.4 | Toast notifications |
| Lucide React | 0.462.0 | Icon library |

---

## 2. Project Structure

```
src/
├── assets/              # Static images (hero, thumbnails, album art)
├── components/
│   ├── ui/              # shadcn/ui base components (button, input, dialog, etc.)
│   ├── AudioCard.tsx    # Audio track card with playback
│   ├── BlogCard.tsx     # Blog post preview card
│   ├── CategoryPills.tsx # Horizontal category filter pills
│   ├── CreatorBadge.tsx # Creator monetization progress card
│   ├── EditProfileDialog.tsx # Profile edit modal
│   ├── Navbar.tsx       # Top navigation bar
│   ├── NavLink.tsx      # Navigation link component
│   ├── SectionHeader.tsx # Section title with "See all" action
│   ├── SubscribeButton.tsx # Subscribe/unsubscribe toggle
│   ├── VideoCard.tsx    # Video thumbnail card
│   ├── VideoComments.tsx # Comments section
│   └── VideoReactions.tsx # Like/reaction buttons
├── hooks/
│   ├── useAuth.tsx      # Auth context provider & hook
│   ├── use-mobile.tsx   # Mobile breakpoint detection
│   ├── use-toast.ts     # Toast hook
│   └── useWatchTimeTracker.ts # Watch time tracking for monetization
├── integrations/
│   ├── supabase/
│   │   ├── client.ts    # Supabase client initialization
│   │   └── types.ts     # Auto-generated DB types
│   └── lovable/
│       └── index.ts     # Lovable auth wrapper (legacy)
├── lib/
│   └── utils.ts         # Tailwind class merge utility
├── pages/
│   ├── Auth.tsx         # Login / signup / forgot password
│   ├── CreatorProfile.tsx # Public creator profile page
│   ├── Dashboard.tsx    # Creator dashboard
│   ├── Index.tsx        # Homepage
│   ├── NotFound.tsx     # 404 page
│   ├── ResetPassword.tsx # Password reset
│   ├── Search.tsx       # Search results page
│   ├── Upload.tsx       # Content upload page
│   └── Watch.tsx        # Video/audio watch page
├── App.tsx              # Root component with routing
├── main.tsx             # React entry point
└── index.css            # Global styles & Tailwind directives
```

---

## 3. Pages Implemented

### 3.1 Homepage (`/`)
- Hero section with animated background image of Africa
- "Start Watching" button scrolls to videos section
- "Upload Content" button navigates to `/upload`
- Trending Videos section with category pill filtering
- Hot Tracks section with real audio playback
- Featured Stories (blogs) section
- Creator Hub showing real creators from DB
- Footer with dynamic copyright year

### 3.2 Auth Page (`/auth`)
- Three modes: Login, Sign Up, Forgot Password
- Email/password authentication via Supabase
- Google OAuth via `supabase.auth.signInWithOAuth`
- Apple OAuth (requires Apple developer account)
- Auto-login after signup when email confirmation is disabled
- Form validation with error toasts

### 3.3 Upload Page (`/upload`)
- Tabbed interface: Video | Audio | Blog
- Drag-and-drop file zones
- Auto-detects duration from video/audio files before upload
- Uploads files to Supabase Storage buckets
- Saves metadata to respective DB tables
- Category/genre selection dropdowns

### 3.4 Dashboard (`/dashboard`)
- Creator profile header with avatar, name, bio
- Stats: Subscribers, Watch Hours, Total Views, Total Streams
- Monetization progress bars (0/100 subs, 0/1000 watch hours)
- Tabbed content management: Videos | Audio | Blogs
- Delete content functionality
- Edit profile dialog

### 3.5 Watch Page (`/watch/:id`)
- Video player with native HTML5 controls
- Watch time tracking (updates profile watch_hours)
- Video reactions (likes)
- Comments section
- Related videos sidebar

### 3.6 Search Page (`/search`)
- Full-text search across videos, audio, blogs
- Content type filter tabs (All, Videos, Music, Blogs)
- URL-synced query params (`?q=...&type=...`)
- Results grouped by content type

### 3.7 Creator Profile (`/creator/:userId`)
- Public profile with avatar, bio, subscriber count
- Subscribe/unsubscribe button
- Tabbed content: Videos | Music | Blogs
- Monetization badge for eligible creators

### 3.8 Reset Password (`/reset-password`)
- Handles Supabase password reset redirect
- New password form with confirmation

---

## 4. Key Components

### AudioCard
- Plays audio via HTML5 `Audio` API
- Detects real duration from audio metadata on first play
- Increments stream count in DB after 30s of playback via `supabase.rpc("increment_streams")`
- Like toggle (local state)

### VideoCard
- Displays thumbnail, title, channel, views, duration
- Monetization badge for eligible creators
- Navigates to `/watch/:id` on click

### CategoryPills
- Animated active pill using Framer Motion `layoutId`
- Calls `onSelect` callback to filter parent content

### SectionHeader
- Optional `onSeeAll` prop — renders "See all" button only when provided
- Navigates to Search page with appropriate filters

### Navbar
- Fixed top bar with glass morphism effect
- Search form navigates to `/search?q=...`
- Shows user avatar + logout when authenticated
- Shows "Sign In" button when unauthenticated
- Mobile hamburger menu with animated drawer

### useAuth Hook
- React context providing `user`, `session`, `profile`, `loading`
- `signOut()` clears session
- `refreshProfile()` re-fetches profile from DB
- Auto-creates profile on first login via DB trigger

---

## 5. Styling System

### Theme
- Dark theme by default (no light mode toggle)
- Gold (`hsl(36 90% 55%)`) as primary accent
- Coral (`hsl(12 80% 55%)`) as secondary accent
- Background: near-black `hsl(30 10% 6%)`

### Custom Utilities
```css
.text-gradient-gold   /* Gold gradient text */
.bg-gradient-gold     /* Gold gradient background */
.bg-gradient-coral    /* Coral gradient background */
.shadow-gold          /* Gold glow shadow */
.glass                /* Frosted glass effect */
```

### Fonts
- Display: Space Grotesk (headings)
- Body: Inter (paragraphs, UI)

---

## 6. Routing

```
/                    → Homepage
/auth                → Authentication
/reset-password      → Password reset
/upload              → Content upload (auth required)
/dashboard           → Creator dashboard (auth required)
/watch/:id           → Watch video
/search              → Search results
/creator/:userId     → Creator public profile
*                    → 404 Not Found
```

---

## 7. State Management

- **Auth state**: React Context (`useAuth`)
- **Server data**: Direct Supabase queries in `useEffect` hooks
- **UI state**: Local `useState` per component
- **URL state**: `useSearchParams` on Search page

---

## 8. What's Not Yet Implemented

| Feature | Status |
|---|---|
| Video comments (UI exists, no DB write) | Partial |
| Notifications | Not started |
| AI recommendations | Not started |
| Premium subscriptions | Not started |
| Ad serving | Not started |
| Content editing after upload | Not started |
| Mobile app | Not started |
