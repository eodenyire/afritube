# 📄 AfriTube Database Schema

---

## 1️⃣ Overview

**Purpose:**
Provide a **comprehensive reference for all AfriTube database tables**, relationships, and security rules. This ensures consistent data integrity, scalability, and secure access.

**Database Platform:** Supabase / PostgreSQL (Lovable Cloud)

**Key Concepts:**

* **RLS (Row-Level Security)** ensures creators can only modify their own content
* **Normalized tables** for scalability
* **Polymorphic content table** for videos, audio, and blogs

---

## 2️⃣ Table Definitions

### 2.1 profiles

| Column                | Type         | Constraints                     | Description                       |
| --------------------- | ------------ | ------------------------------- | --------------------------------- |
| id                    | UUID         | PK, default `gen_random_uuid()` | Unique user ID                    |
| name                  | VARCHAR(100) | NOT NULL                        | Display name                      |
| email                 | VARCHAR(150) | UNIQUE, NOT NULL                | User email                        |
| avatar_url            | TEXT         |                                 | Profile picture URL               |
| bio                   | TEXT         |                                 | User biography                    |
| subscriber_count      | INT          | DEFAULT 0                       | Number of subscribers             |
| watch_hours           | FLOAT        | DEFAULT 0                       | Total watch hours                 |
| is_creator            | BOOLEAN      | DEFAULT FALSE                   | Flag if user is a creator         |
| monetization_eligible | BOOLEAN      | DEFAULT FALSE                   | Flag if eligible for monetization |
| created_at            | TIMESTAMP    | DEFAULT now()                   | Account creation timestamp        |
| updated_at            | TIMESTAMP    | DEFAULT now()                   | Last profile update               |

**RLS Policy Example:**

```sql
CREATE POLICY "profile_self_access" ON profiles
FOR ALL
USING (auth.uid() = id);
```

---

### 2.2 content

| Column        | Type         | Constraints                              | Description                    |
| ------------- | ------------ | ---------------------------------------- | ------------------------------ |
| id            | UUID         | PK, default `gen_random_uuid()`          | Unique content ID              |
| creator_id    | UUID         | FK → profiles(id) NOT NULL               | Owner of the content           |
| type          | VARCHAR(20)  | CHECK (type IN ('video','audio','blog')) | Content type                   |
| url           | TEXT         | NOT NULL                                 | Media URL (video/audio/blog)   |
| thumbnail_url | TEXT         |                                          | Thumbnail for video/audio/blog |
| title         | VARCHAR(200) | NOT NULL                                 | Content title                  |
| description   | TEXT         |                                          | Content description            |
| category      | VARCHAR(50)  |                                          | Category/tag                   |
| created_at    | TIMESTAMP    | DEFAULT now()                            | Upload timestamp               |
| updated_at    | TIMESTAMP    | DEFAULT now()                            | Last update timestamp          |
| is_deleted    | BOOLEAN      | DEFAULT FALSE                            | Soft delete flag               |

**RLS Policy Example:**

```sql
CREATE POLICY "content_owner_access" ON content
FOR ALL
USING (auth.uid() = creator_id);
```

---

### 2.3 analytics

| Column     | Type      | Constraints                     | Description               |
| ---------- | --------- | ------------------------------- | ------------------------- |
| id         | UUID      | PK, default `gen_random_uuid()` | Analytics record ID       |
| content_id | UUID      | FK → content(id) NOT NULL       | Related content           |
| views      | INT       | DEFAULT 0                       | Total views               |
| watch_time | FLOAT     | DEFAULT 0                       | Total watch time in hours |
| likes      | INT       | DEFAULT 0                       | Likes count               |
| shares     | INT       | DEFAULT 0                       | Shares count              |
| created_at | TIMESTAMP | DEFAULT now()                   | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT now()                   | Last update               |

---

### 2.4 subscriptions

| Column        | Type      | Constraints                     | Description                 |
| ------------- | --------- | ------------------------------- | --------------------------- |
| id            | UUID      | PK, default `gen_random_uuid()` | Subscription record ID      |
| subscriber_id | UUID      | FK → profiles(id) NOT NULL      | User subscribing            |
| creator_id    | UUID      | FK → profiles(id) NOT NULL      | Creator being subscribed to |
| subscribed_at | TIMESTAMP | DEFAULT now()                   | Subscription timestamp      |

**RLS Policy:** Subscribers can only read their own subscriptions.

---

### 2.5 monetization

| Column             | Type      | Constraints                     | Description                  |
| ------------------ | --------- | ------------------------------- | ---------------------------- |
| id                 | UUID      | PK, default `gen_random_uuid()` | Record ID                    |
| creator_id         | UUID      | FK → profiles(id) NOT NULL      | Creator owner                |
| eligibility_status | BOOLEAN   | DEFAULT FALSE                   | Eligible for monetization?   |
| revenue            | FLOAT     | DEFAULT 0                       | Total revenue earned         |
| payouts            | JSONB     | DEFAULT '{}'                    | Payout history (amount/date) |
| last_calculated    | TIMESTAMP | DEFAULT now()                   | Last eligibility calculation |

---

## 3️⃣ Relationships

* **profiles → content**: One-to-Many
* **content → analytics**: One-to-One or One-to-Many (if detailed per time period)
* **profiles → subscriptions → profiles**: Many-to-Many (user subscribes to multiple creators)
* **profiles → monetization**: One-to-One

**ER Diagram (Simplified)**:

```
profiles ──< content ──< analytics
    │
    └─< subscriptions >─┐
                         profiles
    │
    └─< monetization
```

---

## 4️⃣ Indexes

| Table         | Index                          | Purpose                        |
| ------------- | ------------------------------ | ------------------------------ |
| profiles      | email_idx (email)              | Quick lookup by email          |
| content       | creator_idx (creator_id)       | Fetch creator content quickly  |
| content       | category_idx (category)        | Filter by category             |
| analytics     | content_idx (content_id)       | Fast analytics retrieval       |
| subscriptions | subscriber_idx (subscriber_id) | Fast user subscription queries |

---

## 5️⃣ Example Queries

* **Fetch creator content with analytics:**

```sql
SELECT c.id, c.title, c.type, a.views, a.watch_time
FROM content c
LEFT JOIN analytics a ON a.content_id = c.id
WHERE c.creator_id = 'CREATOR_UUID';
```

* **Check monetization eligibility:**

```sql
SELECT subscriber_count, watch_hours
FROM profiles
WHERE id = 'CREATOR_UUID';
```

* **Get trending videos (by views):**

```sql
SELECT c.id, c.title, a.views
FROM content c
JOIN analytics a ON a.content_id = c.id
WHERE c.type='video' AND c.is_deleted=false
ORDER BY a.views DESC
LIMIT 20;
```

---

## 6️⃣ Security Policies

* **RLS on `content` & `profiles`**: Only owner can update/delete content/profile
* **Subscriptions**: Users can only see their subscriptions
* **Monetization**: Only admins + creator can view payout history

---

This **database schema document** fully defines the AfriTube data layer, making it **ready for development, migrations, and QA testing**.

---
