# Comments System - Implementation Guide

## 🎯 Overview

We're starting with the **Comments System** as the first TIER 1 feature. This is the foundation for community engagement and will enable future features like notifications, moderation, and analytics.

**Timeline:** 2 weeks (108-144 hours)
**Effort:** MEDIUM
**Impact:** HIGH
**Priority:** TIER 1 - MUST HAVE

---

## 📋 What We're Building

### Core Features
1. ✅ Create comments on videos
2. ✅ Reply to comments (threaded)
3. ✅ Edit your own comments
4. ✅ Delete your own comments
5. ✅ Like comments
6. ✅ Creator hearts comments
7. ✅ Creator pins comments
8. ✅ Flag inappropriate comments
9. ✅ Moderation queue for admins
10. ✅ Mention users (@username)

### Advanced Features
- Markdown formatting (bold, italic, links)
- Emoji support
- GIF support (Giphy API)
- Hashtag support
- Real-time updates
- Pagination/infinite scroll
- Sort by newest, oldest, top

---

## 📊 Implementation Phases

### Phase 1: Database & API (Week 1, Days 1-3)
**Effort:** 20-28 hours

**Tasks:**
1. Create database tables (comments, comment_flags, comment_likes, comment_hearts)
2. Implement API endpoints (create, read, update, delete)
3. Implement moderation endpoints (flag, review)
4. Add validation and error handling
5. Add rate limiting

**Deliverables:**
- ✅ Database schema with indexes
- ✅ 8 API endpoints working
- ✅ Postman collection for testing

---

### Phase 2: Frontend Components (Week 1-2, Days 3-7)
**Effort:** 40-50 hours

**Components:**
1. **CommentForm** - Text input with markdown, mentions, emoji, GIF
2. **CommentThread** - Display single comment with actions
3. **CommentList** - Display all comments with sorting
4. **CommentActions** - Reply, like, flag, edit, delete, pin, heart
5. **ModerationQueue** - Admin moderation interface

**Deliverables:**
- ✅ 5 React components
- ✅ Responsive design (mobile-first)
- ✅ Loading/error states
- ✅ Accessibility support

---

### Phase 3: Integration & Testing (Week 2, Days 7-10)
**Effort:** 36-46 hours

**Tasks:**
1. Integrate with React Query
2. Add notification triggers
3. Write unit tests (80%+ coverage)
4. Write integration tests
5. Write E2E tests

**Deliverables:**
- ✅ React Query hooks
- ✅ Notification integration
- ✅ Test suite with 80%+ coverage
- ✅ E2E test scenarios

---

### Phase 4: Deployment & Monitoring (Week 2, Days 10-11)
**Effort:** 12-20 hours

**Tasks:**
1. Deploy to staging
2. Run smoke tests
3. Deploy to production
4. Set up monitoring
5. Write documentation

**Deliverables:**
- ✅ Production deployment
- ✅ Error tracking (Sentry)
- ✅ Performance monitoring
- ✅ API documentation
- ✅ Deployment guide

---

## 🗄️ Database Schema

### Comments Table
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  user_id UUID REFERENCES auth.users(id),
  parent_comment_id UUID REFERENCES comments(id),
  content TEXT (max 5000 chars),
  is_pinned BOOLEAN,
  is_deleted BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  edited_at TIMESTAMP
);
```

### Comment Flags Table
```sql
CREATE TABLE comment_flags (
  id UUID PRIMARY KEY,
  comment_id UUID REFERENCES comments(id),
  user_id UUID REFERENCES auth.users(id),
  reason VARCHAR,
  status VARCHAR (pending, approved, rejected),
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### Comment Likes Table
```sql
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY,
  comment_id UUID REFERENCES comments(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP
);
```

### Comment Hearts Table
```sql
CREATE TABLE comment_hearts (
  id UUID PRIMARY KEY,
  comment_id UUID REFERENCES comments(id),
  creator_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP
);
```

---

## 🔌 API Endpoints

### Create Comment
```
POST /api/comments
{
  "video_id": "uuid",
  "parent_comment_id": "uuid (optional)",
  "content": "string"
}
```

### Get Comments
```
GET /api/videos/{video_id}/comments?sort=newest&limit=20&offset=0
```

### Update Comment
```
PATCH /api/comments/{comment_id}
{
  "content": "string"
}
```

### Delete Comment
```
DELETE /api/comments/{comment_id}
```

### Pin Comment
```
POST /api/comments/{comment_id}/pin
```

### Heart Comment
```
POST /api/comments/{comment_id}/heart
```

### Like Comment
```
POST /api/comments/{comment_id}/like
```

### Flag Comment
```
POST /api/comments/{comment_id}/flag
{
  "reason": "spam | harassment | hate_speech | misinformation | other",
  "custom_reason": "string (optional)"
}
```

### Get Moderation Queue
```
GET /api/admin/comments/moderation-queue?status=pending&limit=20
```

### Review Flagged Comment
```
POST /api/admin/comments/{flag_id}/review
{
  "action": "approve | reject",
  "reason": "string (optional)"
}
```

---

## 🎨 Frontend Components

### CommentForm
- Text input with character counter
- Markdown support (bold, italic, links)
- Mention autocomplete (@username)
- Emoji picker
- GIF picker (Giphy API)
- Submit/cancel buttons
- Loading state

### CommentThread
- User avatar, name, timestamp
- Comment content with formatting
- Like count
- Reply count
- Pinned/hearted badges
- Action buttons (reply, like, flag, edit, delete, pin, heart)
- Collapse/expand replies

### CommentList
- Display all comments
- Pinned comments at top
- Sort dropdown (newest, oldest, top)
- Pagination or infinite scroll
- Load more button for replies
- Loading/empty states

### CommentActions
- Reply button
- Like button with count
- Flag button
- Edit button (if author)
- Delete button (if author/creator)
- Pin button (if creator)
- Heart button (if creator)

### ModerationQueue
- List of flagged comments
- Flag reason and count
- Approve/reject buttons
- Custom reason input
- Filter by status
- Pagination

---

## 🧪 Testing Strategy

### Unit Tests
- Comment validation (length, content)
- Mention parsing
- Markdown rendering
- Timestamp formatting
- Authorization checks

### Integration Tests
- Create comment flow
- Reply to comment flow
- Edit comment flow
- Delete comment flow
- Pin comment flow
- Heart comment flow
- Like comment flow
- Flag comment flow
- Moderation workflow

### E2E Tests
- User comments on video
- User replies to comment
- Creator pins comment
- Moderator reviews flagged comment
- Comment appears in real-time

---

## 📈 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Comments per video | 5+ | Average comments per video |
| Comment engagement | 30%+ | % of viewers who comment |
| Moderation accuracy | 95%+ | Correct moderation decisions |
| Comment load time | <500ms | API response time |
| Comment submission time | <1s | Time from submit to display |

---

## 🚀 Getting Started

### Day 1: Database Setup
1. Create database tables
2. Add indexes
3. Set up RLS policies
4. Test data integrity

### Day 2: API Implementation
1. Implement create comment endpoint
2. Implement get comments endpoint
3. Implement update/delete endpoints
4. Implement moderation endpoints
5. Add validation and error handling

### Day 3: Frontend Start
1. Create CommentForm component
2. Create CommentThread component
3. Create CommentList component
4. Integrate with API

### Days 4-7: Frontend Completion
1. Create CommentActions component
2. Create ModerationQueue component
3. Add React Query integration
4. Add notification triggers
5. Add loading/error states

### Days 8-10: Testing
1. Write unit tests
2. Write integration tests
3. Write E2E tests
4. Fix bugs

### Days 11-14: Deployment
1. Deploy to staging
2. Run smoke tests
3. Deploy to production
4. Monitor for errors
5. Write documentation

---

## 📚 Documentation

Full spec documents are available in `.kiro/specs/comments-system/`:
- `requirements.md` - Detailed requirements and user stories
- `design.md` - Architecture, database schema, API design
- `tasks.md` - Implementation tasks and timeline

---

## 🎯 Next Steps

1. **Review this guide** with your team
2. **Start with database schema** (Day 1)
3. **Implement API endpoints** (Day 2)
4. **Build frontend components** (Days 3-7)
5. **Write tests** (Days 8-10)
6. **Deploy to production** (Days 11-14)

---

## 💡 Key Decisions

1. **Soft delete** - Comments show "[Deleted]" instead of being removed
2. **Threaded replies** - Max 3 levels of nesting
3. **Moderation queue** - Flagged comments pending review
4. **Creator hearts** - Different from user likes
5. **Pinned comments** - Max 3 per video
6. **Rate limiting** - Max 10 comments per minute per user

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Spam comments | Rate limiting, auto-flagging, moderation queue |
| Harassment | Reporting system, creator moderation tools |
| Performance issues | Pagination, caching, database indexing |
| XSS attacks | Input sanitization, server-side validation |
| Real-time sync issues | WebSocket fallback, polling |

---

## 📞 Questions?

See detailed spec documents:
- `.kiro/specs/comments-system/requirements.md`
- `.kiro/specs/comments-system/design.md`
- `.kiro/specs/comments-system/tasks.md`

