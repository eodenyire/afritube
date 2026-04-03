# <img src="../public/fav.png" width="35" height="35" style="vertical-align:middle;margin-right:-8px"/> AfriTube Backend Implementation

---

## 1. Backend Stack

| Technology | Purpose |
|---|---|
| Supabase | Backend-as-a-Service (BaaS) |
| PostgreSQL | Primary database |
| Supabase Auth | Authentication (email, OAuth) |
| Supabase Storage | File storage (videos, audio, images) |
| Supabase RLS | Row-level security policies |
| Supabase Functions (RPC) | Custom database functions |
| Supabase Realtime | (Available, not yet used) |

---

## 2. Database Tables

### 2.1 `profiles`
Auto-created on user signup via trigger.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| display_name | TEXT | Creator display name |
| avatar_url | TEXT | Profile picture URL |
| bio | TEXT | Creator bio |
| subscriber_count | INTEGER | Auto-updated by trigger |
| watch_hours | NUMERIC | Total watch hours accumulated |
| is_creator | BOOLEAN | Whether user has uploaded content |
| is_monetized | BOOLEAN | Whether monetization threshold met |
| created_at | TIMESTAMPTZ | Auto-set |
| updated_at | TIMESTAMPTZ | Auto-updated by trigger |

### 2.2 `videos`

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| title | TEXT | Video title |
| description | TEXT | Video description |
| video_url | TEXT | Supabase Storage URL |
| thumbnail_url | TEXT | Thumbnail image URL |
| duration | INTEGER | Duration in seconds |
| views | INTEGER | View count |
| category | TEXT | e.g. Comedy, Tech, Music |
| is_published | BOOLEAN | Visibility flag |
| created_at | TIMESTAMPTZ | Auto-set |
| updated_at | TIMESTAMPTZ | Auto-updated |

### 2.3 `audio_tracks`

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| title | TEXT | Track title |
| artist_name | TEXT | Artist name |
| description | TEXT | Track description |
| audio_url | TEXT | Supabase Storage URL |
| cover_url | TEXT | Album art URL |
| duration | INTEGER | Duration in seconds |
| streams | INTEGER | Stream count |
| genre | TEXT | e.g. Afrobeats, Amapiano |
| is_published | BOOLEAN | Visibility flag |
| created_at | TIMESTAMPTZ | Auto-set |
| updated_at | TIMESTAMPTZ | Auto-updated |

### 2.4 `blog_posts`

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| title | TEXT | Post title |
| content | TEXT | Full post body |
| excerpt | TEXT | Short preview text |
| cover_url | TEXT | Featured image URL |
| category | TEXT | Post category |
| likes | INTEGER | Like count |
| comments_count | INTEGER | Comment count |
| is_published | BOOLEAN | Visibility flag |
| created_at | TIMESTAMPTZ | Auto-set |
| updated_at | TIMESTAMPTZ | Auto-updated |

### 2.5 `subscriptions`

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| subscriber_id | UUID | FK → auth.users (the follower) |
| creator_id | UUID | FK → auth.users (being followed) |
| created_at | TIMESTAMPTZ | Auto-set |

Unique constraint on `(subscriber_id, creator_id)` prevents duplicate subscriptions.

---

## 3. Storage Buckets

| Bucket | Public | Used For |
|---|---|---|
| `videos` | Yes | Video file uploads |
| `audio` | Yes | Audio file uploads |
| `thumbnails` | Yes | Video thumbnails & audio cover art |
| `blog-images` | Yes | Blog featured images |

Files are stored under `{user_id}/{timestamp}-{filename}` paths.

---

## 4. Database Functions (RPC)

### `handle_new_user()`
Trigger function — fires on `auth.users` INSERT.
Auto-creates a `profiles` row with display name and avatar from OAuth metadata.

### `update_updated_at_column()`
Trigger function — fires BEFORE UPDATE on all tables.
Sets `updated_at = now()`.

### `check_monetization_eligibility(p_user_id UUID)`
Called to check and update monetization status.
Sets `is_monetized = true` if `subscriber_count >= 100 AND watch_hours >= 1000`.

### `update_subscriber_count()`
Trigger function — fires AFTER INSERT OR DELETE on `subscriptions`.
Recalculates and updates `profiles.subscriber_count` for the affected creator.

### `increment_streams(track_id UUID)`
RPC function called from the frontend AudioCard component.
Atomically increments `audio_tracks.streams` by 1.

```sql
create or replace function increment_streams(track_id uuid)
returns void language sql security definer as $$
  update audio_tracks set streams = streams + 1 where id = track_id;
$$;
```

---

## 5. Row Level Security (RLS)

All tables have RLS enabled. Policies follow this pattern:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | Everyone | Own row only | Own row only | — |
| videos | Everyone | Authenticated (own) | Own row only | Own row only |
| audio_tracks | Everyone | Authenticated (own) | Own row only | Own row only |
| blog_posts | Everyone | Authenticated (own) | Own row only | Own row only |
| subscriptions | Everyone | Authenticated (own subscriber_id) | — | Own row only |

Storage policies mirror the same pattern — anyone can read, authenticated users can write to their own folder.

---

## 6. Authentication

- Provider: Supabase Auth
- Methods: Email/password, Google OAuth, Apple OAuth
- Email confirmation: Disabled (auto-confirm enabled via Lovable dashboard)
- Session: JWT stored in `localStorage`, auto-refreshed
- Profile auto-creation: Via `on_auth_user_created` trigger

---

## 7. Migrations Log

| Migration File | Description |
|---|---|
| `20260327_...sql` | Create profiles table, RLS, triggers, monetization function |
| `20260328_...sql` | Create storage buckets, videos, audio_tracks, blog_posts tables |
| `20260330_...sql` | Create subscriptions table with auto subscriber count trigger |
| `20260401_...sql` | Additional schema updates |
| `20260402_...sql` | Additional schema updates |
| `20260402120000_increment_streams_fn.sql` | Add increment_streams RPC function |

---

## 8. What's Not Yet Implemented

| Feature | Status |
|---|---|
| Comments table & API | Not started |
| Video views increment RPC | Not started |
| Watch time update RPC | Partial (frontend hook exists) |
| Notifications table | Not started |
| Ad serving integration | Not started |
| Revenue tracking table | Not started |
| Content moderation | Not started |
