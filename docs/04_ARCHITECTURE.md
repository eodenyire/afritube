# 📄 Afritube Architecture Document

---

## 1️⃣ Overview

**Purpose:**
Provide a clear visual and technical guide to AfriTube’s system, including all services, data flows, storage, and edge delivery.

**Scope:**
Covers **frontend, backend, storage, microservices, analytics, monetization, CDN/edge caching, and database interactions**.

---

## 2️⃣ High-Level Architecture

```
                      +----------------------+
                      |      Frontend        |
                      |  (React + Tailwind)  |
                      +----------+-----------+
                                 |
                 REST / GraphQL APIs / WebSockets
                                 |
        +------------------------+------------------------+
        |                                                 |
+-----------------+                           +-----------------+
| Auth Service    |                           | Content Service |
| (Login/Profiles)|                           | Video/Audio/Blog|
+--------+--------+                           +--------+--------+
         |                                              |
         v                                              v
     User DB (Supabase)                     Storage Buckets (Supabase/Lovable)
  - Profiles table                          - Videos
  - Auth tokens                             - Audio Tracks
  - Monetization flags                       - Thumbnails
  - Subscriptions                            - Blog Images
```

**Key Notes:**

* **Edge-first delivery:** Media served from CDN nodes close to users
* **RLS Security:** Users can only access their own content for CRUD operations
* **Microservices-ready:** Auth, Content, Analytics, Monetization can scale independently

---

## 3️⃣ Microservices Design

| Service              | Responsibilities                                        | Key Interactions               |
| -------------------- | ------------------------------------------------------- | ------------------------------ |
| Auth Service         | Signup/Login, OAuth, JWT token management, profile CRUD | User DB, Frontend              |
| Content Service      | Upload/manage content, metadata, thumbnails, previews   | Storage, DB, Frontend          |
| Analytics Service    | Track views, watch time, likes, shares                  | DB, Dashboard, Monetization    |
| Monetization Service | Calculate eligibility, enable ads, store payouts        | Analytics, DB, Content Service |
| Notification Service | Future: notify users about new uploads/subscriptions    | Frontend, DB                   |

---

## 4️⃣ Storage & Media Architecture

**Buckets (Supabase / Lovable Cloud):**

| Bucket       | Purpose                |
| ------------ | ---------------------- |
| videos       | MP4/AVI/MKV uploads    |
| audio_tracks | MP3/AAC/WAV uploads    |
| thumbnails   | Video/audio thumbnails |
| blog_images  | Blog post images       |

**Media Flow:**

1. Creator uploads file + metadata
2. Backend validates and stores in correct bucket
3. Triggers asynchronous jobs:

   * Generate thumbnails (video/audio)
   * Index blog content for search
4. CDN caches content for edge delivery
5. Analytics logs user interactions

---

## 5️⃣ Database Architecture (Simplified)

```
profiles
+------------+------------+
| Field      | Description|
+------------+------------+
| id         | PK         |
| name       | string     |
| avatar     | URL        |
| bio        | text       |
| subscriber_count | int   |
| watch_hours | float     |
| is_creator  | bool      |
| monetization_eligible | bool |
+------------+------------+

content
+------------+------------+
| id         | PK         |
| creator_id | FK         |
| type       | video/audio/blog |
| url        | string     |
| thumbnail  | string     |
| title      | string     |
| description| string     |
| category   | string     |
| created_at | timestamp  |
| updated_at | timestamp  |
+------------+------------+

analytics
+------------+------------+
| content_id | FK         |
| views      | int        |
| watch_time | float      |
| likes      | int        |
| shares     | int        |
+------------+------------+
```

**Security:**

* RLS ensures creators can only modify their own content
* Sensitive info encrypted at rest

---

## 6️⃣ API / Data Flow Diagram

```
[Frontend] --> [Auth Service] --> [User DB]
       |            ^
       v            |
[Content Service] --> [Storage Buckets]
       |
       v
[Analytics Service] --> [Analytics DB] --> [Dashboard/Monetization Service]
       |
       v
[Edge CDN] --> [Users]
```

**Notes:**

* Frontend communicates with backend via **REST/GraphQL APIs**
* CDN caches videos/audio for **low-latency streaming**
* Analytics service aggregates metrics for dashboards & monetization

---

## 7️⃣ Edge & CDN Strategy

* Deploy **edge nodes in multiple African regions**
* Use **adaptive streaming** to optimize low-bandwidth playback
* Cache thumbnails & videos/audio for faster loading
* Expire caches on content updates

---

## 8️⃣ Security Architecture

1. **Authentication**

   * JWT tokens, OAuth 2.0
   * Passwords hashed + salted
2. **Data Security**

   * Row-level security (RLS) for content tables
   * Encrypted buckets for media files
3. **Transport Security**

   * HTTPS enforced
   * Secure WebSockets for real-time updates
4. **Compliance**

   * GDPR-like rules for personal data
   * Regional data residency in African countries

---

## 9️⃣ Scalability & Reliability

* Horizontal scaling of services
* Serverless edge functions for uploads & processing
* CDN + edge caching to reduce origin load
* Queue-based async jobs for thumbnails & analytics
* DB replication & indexing for high performance

---

## 10️⃣ Monitoring & Logging

* Track uploads, downloads, playback errors
* Monitor CPU/memory usage of services
* Log monetization eligibility events
* Alerts for failed uploads or CDN errors

---

This architecture doc provides a **full visual and technical blueprint** to guide engineers and DevOps for AfriTube deployment and scaling.

---
