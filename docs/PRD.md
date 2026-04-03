# <img src="../public/fav.png" width="35" height="35" style="vertical-align:middle;margin-right:-8px"/> AfriTube Product Requirements Document (PRD)

---

## 1️⃣ Overview

**Product Name:** AfriTube
**Purpose:** Build a pan-African digital content ecosystem combining **video, audio, and blogs**, with creator monetization capabilities.
**Audience:** African creators (video/audio/blog) and viewers (logged-in or anonymous).
**Platform Goals:**

* High-quality, scalable streaming and publishing
* Creator monetization with clear eligibility
* Mobile-first, low-bandwidth optimized experience

---

## 2️⃣ Functional Requirements (Features)

### 2.1 User Authentication & Profiles

| Feature            | Description                                            | Priority |
| ------------------ | ------------------------------------------------------ | -------- |
| Sign Up / Login    | Email/password, Google OAuth, Apple Sign-In            | High     |
| Profile Management | Avatar, bio, display name, metrics (subs, watch hours) | High     |
| Password Recovery  | Reset password via email                               | Medium   |

### 2.2 Content Management

| Feature          | Description                                                      | Priority |
| ---------------- | ---------------------------------------------------------------- | -------- |
| Video Upload     | MP4/AVI/MKV, thumbnail upload, title, description, category tags | High     |
| Audio Upload     | MP3/WAV/AAC, album art, title, artist, genre                     | High     |
| Blog Publishing  | Title, body, tags, featured image                                | High     |
| Content Editing  | Edit title, description, thumbnail after upload                  | Medium   |
| Content Deletion | Soft-delete option for creators                                  | Medium   |

### 2.3 Content Discovery

| Feature         | Description                                         | Priority |
| --------------- | --------------------------------------------------- | -------- |
| Homepage        | Trending videos, music, blogs with category filters | High     |
| Search          | Keyword search across video, audio, blogs           | High     |
| Category Pages  | Filtered by Tech, Comedy, Music, Lifestyle, etc.    | Medium   |
| Recommendations | Personalized content feed (future AI-based)         | Low      |

### 2.4 Creator Monetization

| Feature            | Description                                      | Priority |
| ------------------ | ------------------------------------------------ | -------- |
| Eligibility Check  | 100 subscribers & 1,000 watch hours              | High     |
| Progress Dashboard | Visual progress bars for subs/watch hours        | High     |
| Ad Integration     | Once eligible, platform serves ads automatically | Medium   |
| Revenue Tracking   | Earnings per video/audio/blog                    | Medium   |

### 2.5 Analytics

| Feature          | Description                         | Priority |
| ---------------- | ----------------------------------- | -------- |
| Views Tracking   | Unique views per content            | High     |
| Watch Time       | Total minutes watched per video     | High     |
| Likes/Engagement | Likes, comments, shares (future)    | Medium   |
| Creator Insights | Breakdown of top-performing content | Medium   |

### 2.6 User Experience

| Feature           | Description                                   | Priority |
| ----------------- | --------------------------------------------- | -------- |
| Guest Access      | Browse & watch without login                  | High     |
| Responsive Layout | Mobile, tablet, desktop                       | High     |
| Notifications     | New uploads from subscribed creators (future) | Medium   |
| Accessibility     | WCAG-compliant, captions on videos            | Medium   |

---

## 3️⃣ Non-Functional Requirements

| Category    | Requirement                                                                |
| ----------- | -------------------------------------------------------------------------- |
| Performance | Video playback latency < 2s, scalable to 10k concurrent streams per region |
| Scalability | Support 1M+ users in first year, multi-region edge nodes                   |
| Security    | OAuth 2.0, JWT session management, encrypted storage                       |
| Reliability | 99.9% uptime, automatic retry for failed uploads                           |
| Compliance  | GDPR-like data privacy, local African data sovereignty laws                |

---

## 4️⃣ User Stories

**Creator Stories**

1. *As a creator*, I want to upload videos so my audience can watch them.
2. *As a creator*, I want to track my subscriber count and watch hours to know when I’m monetization-eligible.
3. *As a creator*, I want to edit my uploaded content to fix mistakes or update info.

**Viewer Stories**

1. *As a viewer*, I want to browse trending videos, music, and blogs without creating an account.
2. *As a viewer*, I want to subscribe to my favorite creators to get updates.
3. *As a viewer*, I want smooth playback even on low-bandwidth connections.

**Admin Stories**

1. *As an admin*, I want to monitor content uploads to prevent copyright or inappropriate content.
2. *As an admin*, I want to manage ad integration for eligible creators.

---

## 5️⃣ Wireframes / UI Flow (Summary)

1. **Landing Page** – Hero banner, trending videos/music/blogs, sign-in CTA
2. **Auth Pages** – Sign-up/login with social login options
3. **Upload Page** – Tabs for Video, Audio, Blog uploads
4. **Dashboard** – Creator stats, monetization progress, content management
5. **Content Pages** – Video/audio/blog display with likes, comments, share
6. **Search/Category Pages** – Filtered results by tags/categories
7. **Profile Page** – Display creator metrics, bio, uploaded content

*(Detailed wireframes to be created in Figma or equivalent.)*

---

## 6️⃣ API Requirements (High-level)

* `POST /auth/signup` – Create account
* `POST /auth/login` – Authenticate user
* `GET /user/profile` – Fetch profile data
* `POST /content/upload` – Upload video/audio/blog
* `GET /content/trending` – Fetch trending content
* `GET /content/:id` – Fetch specific content
* `GET /dashboard/analytics` – Fetch creator metrics
* `GET /monetization/status` – Check eligibility

---

## 7️⃣ Acceptance Criteria

1. Video, audio, and blog uploads succeed and appear on homepage.
2. Guest users can watch content without logging in.
3. Monetization progress accurately reflects subs/watch hours.
4. Social login works via Google & Apple.
5. Dashboard updates in real-time with analytics.
6. Responsive layout works across devices.

---

## 8️⃣ Dependencies

* **Lovable Cloud** – backend, authentication, storage
* **Supabase** – database & storage tables
* **Vite + React + Tailwind** – frontend
* **Edge CDN** – video/audio streaming
* **OAuth Providers** – Google, Apple

---

## 9️⃣ Roadmap / Milestones

| Phase   | Features                                                | Timeline  |
| ------- | ------------------------------------------------------- | --------- |
| Phase 1 | MVP: Video + Audio + Blog + Auth + Dashboard            | 4-6 weeks |
| Phase 2 | Monetization Engine + Ad Integration                    | +2 weeks  |
| Phase 3 | Recommendations + Notifications + Premium Subscriptions | +4 weeks  |
| Phase 4 | AI-Powered Discovery + Analytics Insights               | +6 weeks  |

---
