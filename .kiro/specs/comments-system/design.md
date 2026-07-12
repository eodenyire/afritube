# Comments System - Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  CommentList → CommentThread → CommentForm → CommentActions │
└────────────────────────┬────────────────────────────────────┘
                         │
                    React Query
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  API Layer (REST)                            │
├─────────────────────────────────────────────────────────────┤
│  POST /comments, GET /comments, PATCH /comments, DELETE ... │
└────────────────────────┬────────────────────────────────────┘
                         │
                    Supabase
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Database (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────┤
│  comments, comment_flags, comment_likes, comment_hearts     │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Comments Table
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  edited_at TIMESTAMP,
  
  CONSTRAINT content_length CHECK (LENGTH(content) <= 5000),
  CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Indexes for performance
CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_is_pinned ON comments(is_pinned) WHERE NOT is_deleted;
```

### Comment Flags Table
```sql
CREATE TABLE comment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR NOT NULL,
  custom_reason TEXT,
  status VARCHAR DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_flag_per_user_comment UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_flags_status ON comment_flags(status);
CREATE INDEX idx_comment_flags_created_at ON comment_flags(created_at DESC);
```

### Comment Likes Table
```sql
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_like_per_user_comment UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
```

### Comment Hearts Table
```sql
CREATE TABLE comment_hearts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_heart_per_creator_comment UNIQUE(comment_id, creator_id)
);

CREATE INDEX idx_comment_hearts_comment_id ON comment_hearts(comment_id);
```

---

## API Design

### REST Endpoints

#### Create Comment
```
POST /api/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "video_id": "uuid",
  "parent_comment_id": "uuid (optional)",
  "content": "string (max 5000 chars)"
}

Response 201:
{
  "id": "uuid",
  "video_id": "uuid",
  "user_id": "uuid",
  "parent_comment_id": "uuid | null",
  "content": "string",
  "is_pinned": false,
  "is_deleted": false,
  "created_at": "2026-05-25T10:00:00Z",
  "updated_at": "2026-05-25T10:00:00Z",
  "edited_at": null,
  "user": {
    "id": "uuid",
    "display_name": "string",
    "avatar_url": "string"
  },
  "reply_count": 0,
  "like_count": 0,
  "is_liked_by_user": false,
  "is_hearted_by_creator": false
}
```

#### Get Comments for Video
```
GET /api/videos/{video_id}/comments?sort=newest&limit=20&offset=0
Authorization: Bearer {token}

Response 200:
{
  "comments": [
    {
      "id": "uuid",
      "video_id": "uuid",
      "user_id": "uuid",
      "parent_comment_id": null,
      "content": "string",
      "is_pinned": true,
      "is_deleted": false,
      "created_at": "2026-05-25T10:00:00Z",
      "user": { ... },
      "reply_count": 3,
      "like_count": 5,
      "is_liked_by_user": false,
      "is_hearted_by_creator": true,
      "replies": [
        {
          "id": "uuid",
          "content": "string",
          "user": { ... },
          ...
        }
      ]
    }
  ],
  "total": 42,
  "has_more": true
}
```

#### Update Comment
```
PATCH /api/comments/{comment_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "string (max 5000 chars)"
}

Response 200:
{
  "id": "uuid",
  "content": "string",
  "edited_at": "2026-05-25T10:05:00Z",
  ...
}
```

#### Delete Comment
```
DELETE /api/comments/{comment_id}
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Comment deleted"
}
```

#### Pin Comment
```
POST /api/comments/{comment_id}/pin
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "is_pinned": true
}
```

#### Heart Comment
```
POST /api/comments/{comment_id}/heart
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "is_hearted_by_creator": true
}
```

#### Like Comment
```
POST /api/comments/{comment_id}/like
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "like_count": 5,
  "is_liked_by_user": true
}
```

#### Flag Comment
```
POST /api/comments/{comment_id}/flag
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "spam | harassment | hate_speech | misinformation | other",
  "custom_reason": "string (optional)"
}

Response 201:
{
  "id": "uuid",
  "comment_id": "uuid",
  "reason": "string",
  "status": "pending"
}
```

#### Get Moderation Queue
```
GET /api/admin/comments/moderation-queue?status=pending&limit=20&offset=0
Authorization: Bearer {admin_token}

Response 200:
{
  "flags": [
    {
      "id": "uuid",
      "comment": {
        "id": "uuid",
        "content": "string",
        "user": { ... },
        "video_id": "uuid"
      },
      "reason": "string",
      "flag_count": 3,
      "created_at": "2026-05-25T10:00:00Z"
    }
  ],
  "total": 15,
  "has_more": false
}
```

#### Review Flagged Comment
```
POST /api/admin/comments/{flag_id}/review
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "action": "approve | reject",
  "reason": "string (optional)"
}

Response 200:
{
  "id": "uuid",
  "status": "approved | rejected"
}
```

---

## Frontend Components

### CommentList.tsx
```typescript
interface CommentListProps {
  videoId: string;
  sort?: 'newest' | 'oldest' | 'top';
}

// Features:
// - Display all comments for video
// - Sort dropdown
// - Infinite scroll or pagination
// - Pinned comments at top
// - Load more button
```

### CommentThread.tsx
```typescript
interface CommentThreadProps {
  comment: Comment;
  isReply?: boolean;
  onReply?: (parentId: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

// Features:
// - Display single comment
// - Show user info, timestamp, content
// - Show action buttons
// - Show pinned/hearted badges
// - Collapse/expand replies
// - Show reply count
```

### CommentForm.tsx
```typescript
interface CommentFormProps {
  videoId: string;
  parentCommentId?: string;
  onSubmit?: (content: string) => void;
  onCancel?: () => void;
}

// Features:
// - Text input with markdown support
// - Character counter
// - Mention autocomplete
// - Emoji picker
// - GIF picker
// - Submit/cancel buttons
// - Loading state
```

### CommentActions.tsx
```typescript
interface CommentActionsProps {
  comment: Comment;
  isAuthor: boolean;
  isCreator: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onHeart?: () => void;
  onLike?: () => void;
  onFlag?: () => void;
}

// Features:
// - Reply button
// - Like button with count
// - Flag button
// - Edit button (if author)
// - Delete button (if author or creator)
// - Pin button (if creator)
// - Heart button (if creator)
```

### ModerationQueue.tsx
```typescript
interface ModerationQueueProps {
  onReview?: (flagId: string, action: 'approve' | 'reject') => void;
}

// Features:
// - List of flagged comments
// - Approve/reject buttons
// - Custom reason input
// - Filter by status
// - Pagination
// - Flag count per comment
```

---

## Data Flow

### Creating a Comment
```
User types comment
    ↓
User clicks "Post"
    ↓
CommentForm validates input
    ↓
API POST /api/comments
    ↓
Server validates & sanitizes
    ↓
Database INSERT
    ↓
Return comment with user info
    ↓
Update CommentList UI
    ↓
Show success message
```

### Replying to Comment
```
User clicks "Reply"
    ↓
CommentForm appears with parent context
    ↓
User types reply
    ↓
User clicks "Post"
    ↓
API POST /api/comments (with parent_comment_id)
    ↓
Database INSERT with parent_comment_id
    ↓
Update CommentThread UI
    ↓
Show reply in thread
```

### Moderating Comment
```
User flags comment
    ↓
API POST /api/comments/{id}/flag
    ↓
Database INSERT into comment_flags
    ↓
Moderator sees in queue
    ↓
Moderator clicks "Approve" or "Reject"
    ↓
API POST /api/admin/comments/{flag_id}/review
    ↓
Database UPDATE comment_flags status
    ↓
If rejected: UPDATE comments is_deleted=true
    ↓
Update UI
```

---

## Security Considerations

### Input Validation
- Max 5000 characters per comment
- Sanitize HTML/JavaScript (XSS prevention)
- Validate video_id and parent_comment_id exist
- Validate user is authenticated

### Rate Limiting
- Max 10 comments per minute per user
- Max 5 flags per minute per user
- Max 100 comments per video per hour

### Authorization
- User can only edit/delete their own comments
- Creator can delete any comment on their video
- Creator can pin/heart comments on their video
- Only admins can review moderation queue

### Data Privacy
- Don't expose deleted comment content
- Don't expose flag reasons to comment author
- Don't expose moderator identity

---

## Performance Optimization

### Database
- Index on video_id for fast comment retrieval
- Index on created_at for sorting
- Index on is_pinned for pinned comments
- Soft delete (is_deleted flag) instead of hard delete

### Caching
- Cache comment count per video
- Cache pinned comments per video
- Invalidate cache on new comment/delete

### Pagination
- Load 20 comments per page
- Lazy load replies (max 5 shown, "Load more" button)
- Infinite scroll option

### API
- Return only necessary fields
- Batch load user info
- Use database views for complex queries

---

## Testing Strategy

### Unit Tests
- Comment validation (length, content)
- Mention parsing
- Markdown rendering
- Timestamp formatting

### Integration Tests
- Create comment
- Reply to comment
- Edit comment
- Delete comment
- Pin comment
- Heart comment
- Like comment
- Flag comment
- Moderation workflow

### E2E Tests
- User comments on video
- User replies to comment
- Creator pins comment
- Moderator reviews flagged comment
- Comment appears in real-time

---

## Deployment Plan

### Phase 1: Database
- Create tables and indexes
- Set up RLS policies
- Test data integrity

### Phase 2: API
- Implement endpoints
- Add validation and error handling
- Add rate limiting
- Test with Postman

### Phase 3: Frontend
- Build components
- Integrate with API
- Add loading/error states
- Test on mobile

### Phase 4: Testing
- Unit tests
- Integration tests
- E2E tests
- Performance testing

### Phase 5: Deployment
- Deploy to staging
- Run smoke tests
- Deploy to production
- Monitor for errors

---

## Monitoring & Analytics

### Metrics to Track
- Comments per video (average)
- Comment engagement rate
- Moderation queue size
- Moderation accuracy
- API response times
- Error rates

### Alerts
- Moderation queue > 100 items
- API response time > 1s
- Error rate > 1%
- Database connection issues

