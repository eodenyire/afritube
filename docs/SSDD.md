# 📄 AfriTube SSDD (System & Software Design Document)

---

## 1️⃣ Overview

**Product Name:** AfriTube
**Purpose:** Provide a highly scalable, multi-format content platform optimized for African creators and audiences.
**Scope:** End-to-end system covering:

* Authentication & User Profiles
* Video, Audio, Blog Management
* Creator Monetization Engine
* Analytics & Reporting
* Edge-first streaming for low bandwidth regions
* Cloud-native deployment using Lovable Cloud

**Audience:** Software engineers, DevOps, system architects, and QA teams.

---

## 2️⃣ System Architecture Overview

**High-level Design:**

AfriTube follows a **modular, microservices-friendly, cloud-native architecture**:

```
          +--------------------+
          |     Frontend       |  (React + Tailwind)
          +--------------------+
                     |
          REST/GraphQL APIs / WebSockets
                     |
   +-----------------+----------------+
   |                                 |
+--------+                   +-----------------+
| Auth   |                   | Content Service |
| Service|                   | (Video/Audio/Blog)
+--------+                   +-----------------+
   |                                 |
   |                                 |
   v                                 v
User DB (Supabase)           Storage Buckets (Supabase / Lovable Cloud)
- Profiles                   - Videos / Thumbnails
- Auth tokens                - Audio tracks
- Subscriptions              - Blog images
- Monetization flags
```

**Key Features of Architecture:**

* **Edge-first content delivery** – cache videos/audio close to users for low latency
* **RLS (Row-Level Security)** in DB – ensures creators can only manage their content
* **Modular services** – allows independent scaling of auth, content, analytics
* **Serverless/Edge Runtime** – minimizes infrastructure overhead

---

## 3️⃣ Component Design

### 3.1 Frontend (React + Tailwind)

* **Pages & Components**:

  * Landing Page
  * Auth Pages (Login/Signup)
  * Dashboard (Creator Analytics)
  * Upload Page (Video/Audio/Blog)
  * Content Player Page
  * Profile Page
* **State Management**:

  * React Query / SWR for server state
  * Context API for auth & user profile
* **Media Playback**:

  * HTML5 video/audio player with adaptive streaming
  * Lazy loading & prefetch for low bandwidth

### 3.2 Backend / Services

#### 3.2.1 Authentication Service

* Handles all user login/signup flows
* Supports:

  * Email/Password
  * OAuth 2.0 (Google/Apple)
* Generates JWT tokens for session management
* Integrates directly with Supabase auth tables

#### 3.2.2 Content Service

* Handles CRUD operations for Video, Audio, and Blogs
* Implements:

  * Upload endpoints
  * Metadata storage (title, description, category, tags)
  * Content deletion / soft-delete
* Enforces RLS: creators can only modify their own content
* Triggers thumbnail generation & audio previews

#### 3.2.3 Analytics Service

* Tracks:

  * Views
  * Watch time
  * Likes & engagement
* Stores aggregated stats per content piece
* Provides endpoints for dashboards

#### 3.2.4 Monetization Service

* Checks eligibility: 100 subs & 1,000 watch hours
* Marks content monetizable
* Provides ad integration interface
* Stores revenue & payout history

---

## 4️⃣ Database Design (Overview)

**Tables** (see detailed DB schema in `/docs/05_DATABASE_SCHEMA.md`):

* **profiles**

  * id, name, avatar, bio, subscriber_count, watch_hours, is_creator, monetization_eligible
* **content**

  * id, creator_id, type (video/audio/blog), url, thumbnail_url, title, description, category, created_at, updated_at
* **analytics**

  * content_id, views, watch_time, likes, shares
* **subscriptions**

  * subscriber_id, creator_id, subscribed_at
* **monetization**

  * creator_id, revenue, payouts, eligibility_status

**Security:**

* RLS policies restrict content access to owner
* Sensitive user info encrypted at rest

---

## 5️⃣ Storage & Media Handling

**Storage Buckets** (Supabase/Lovable Cloud):

| Bucket       | Purpose                |
| ------------ | ---------------------- |
| videos       | Uploaded video files   |
| audio_tracks | Music / audio uploads  |
| thumbnails   | Video/audio thumbnails |
| blog_images  | Blog post images       |

**Media Workflow:**

1. User uploads video/audio/blog
2. Backend validates file & metadata
3. File stored in correct bucket
4. Metadata stored in `content` table
5. Trigger background job:

   * Video thumbnail generation
   * Audio waveform preview
   * Blog content indexing for search

**Edge Delivery:** Use CDN nodes to cache video/audio for faster playback.

---

## 6️⃣ API Design (High-level)

| Endpoint             | Method | Description                |
| -------------------- | ------ | -------------------------- |
| /auth/signup         | POST   | Create user account        |
| /auth/login          | POST   | Login via email/password   |
| /auth/social         | POST   | OAuth login (Google/Apple) |
| /content/upload      | POST   | Upload video/audio/blog    |
| /content/:id         | GET    | Fetch single content       |
| /content/trending    | GET    | Fetch trending content     |
| /dashboard/analytics | GET    | Fetch creator stats        |
| /monetization/status | GET    | Check eligibility          |
| /subscriptions       | POST   | Subscribe to creator       |

---

## 7️⃣ System Workflows

### 7.1 Upload Flow

1. Creator clicks **Upload**
2. Select content type (video/audio/blog)
3. Upload file + metadata
4. Backend validates & stores file
5. Thumbnail/waveform generated asynchronously
6. Creator dashboard updated

### 7.2 Monetization Eligibility

1. Analytics service calculates watch hours & subscribers
2. Monetization service checks thresholds
3. Creator dashboard shows progress bars
4. Once eligible, ads enabled on content

### 7.3 Content Consumption

1. User (logged in or guest) visits homepage
2. Requests video/audio/blog
3. CDN serves cached media
4. Analytics tracked (views, watch time)

---

## 8️⃣ Security & Compliance

* OAuth 2.0 and JWT session tokens
* RLS for database tables
* File validation & size limits
* HTTPS enforced everywhere
* GDPR-like compliance
* Data residency in African regions where required

---

## 9️⃣ Scalability & Performance

* Horizontal scaling of backend services
* CDN + edge caching for video/audio
* Serverless functions for upload processing
* Asynchronous jobs for thumbnails & analytics aggregation
* DB indexing for search & filtering

---

## 10️⃣ Monitoring & Logging

* Log uploads, downloads, errors
* Monitor user growth & traffic
* Track monetization events
* Alert system for failed uploads or server errors

---

This SSDD ensures **engineers, DevOps, and QA** have a **full blueprint to build AfriTube at scale**, covering architecture, storage, APIs, and workflows.

---
