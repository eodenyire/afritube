# <img src="public/fav.png" width="35" height="35" style="vertical-align:middle;margin-right:-8px"/> AfriTube: Africa's #1 Content Platform

**AfriTube** is a high-performance, decentralized-style content hub designed to empower African creators. It merges video streaming, music discovery, and micro-blogging into a single ecosystem with a built-in path to monetization.

## 🚀 Core Features

### 1. Multi-Format Content Engine
* **Video Streaming:** High-definition video playback with category filtering (Tech, Comedy, Afrobeats, etc.).
* **Audio/Music:** Dedicated "Hot Tracks" section for Amapiano, Highlife, and Afrobeats.
* **Blogs & Stories:** A medium-style publishing platform for long-form African narratives.

### 2. Creator Monetization Hub
AfriTube implements a strict but achievable monetization gateway to ensure quality and engagement:
* **Threshold:** 100 Subscribers AND 1,000 Watch Hours.
* **Status Tracking:** Real-time progress bars for creators to track their eligibility.
* **Ad-Integration:** Once eligible, the platform enables automated ad-rolls and revenue sharing.

### 3. Admin Operations Console
* **Creator Management:** Review creator engagement, subscriber counts, and monetization status.
* **Content Oversight:** Manage videos, tracks, and blog posts from a single dashboard.

### 4. User Experience & Auth
* **Hybrid Access:** Users can browse and watch content anonymously or create an account for a personalized experience.
* **Unified Auth:** Secure login via **Email**, **Google**, and **Apple** (powered by Lovable Cloud).
* **Smart Profiles:** Automatic profile generation including bios, avatars, and creator metrics.

---

## 🛠 Technical Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React.js with Tailwind CSS |
| **Design System** | Custom "African Earth" Palette (Gold, Coral, Charcoal) |
| **Backend/DB** | Lovable Cloud (Supabase-driven) |
| **Authentication** | OAuth 2.0 (Google/Apple) + JWT |
| **Deployment** | Lovable Edge Runtime |

---

## 📊 Logic & Data Flow

### Monetization Validation
The system calculates eligibility using a simple Boolean check:
$$Eligible = (Subscribers \ge 100) \land (WatchHours \ge 1000)$$

### Database Schema (Key Tables)
* **`profiles`**: Stores user metadata, `is_creator` flags, and `bio`.
* **`content`**: Polymorphic table handling `video_url`, `audio_url`, and `blog_body`.
* **`analytics`**: Tracks unique views and total watch time per content piece.

---

## 🏗 Getting Started

1.  **Clone the Repo:** `git clone https://github.com/eodenyire/afritube.git`
2.  **Install Dependencies:** `npm install`
3.  **Environment Variables:** Configure your Supabase keys and `VITE_ADMIN_EMAILS` in `.env`.
4.  **Run Development:** `npm run dev`

---
