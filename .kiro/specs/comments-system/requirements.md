# Comments System - Requirements Document

## Feature Name
Comments System for AfriTube

## Overview
Enable creators and viewers to engage through comments on videos. This is the foundation for community building and will support future features like notifications, moderation, and creator engagement metrics.

## Business Goals
1. **Increase engagement** - Comments per video: 5+ (target)
2. **Build community** - Enable creator-viewer interaction
3. **Improve retention** - Users spend more time on platform
4. **Foundation for growth** - Enable notifications, moderation, analytics

## User Stories

### Story 1: Viewer Comments on Video
**As a** viewer
**I want to** leave a comment on a video
**So that** I can share my thoughts and engage with the creator

**Acceptance Criteria:**
- [ ] User can write a comment (max 5000 characters)
- [ ] Comment is posted immediately
- [ ] Comment appears in comment section
- [ ] User sees "Posted" confirmation
- [ ] Comment shows timestamp (e.g., "2 hours ago")
- [ ] Comment shows user avatar and name

---

### Story 2: Reply to Comment
**As a** viewer
**I want to** reply to another user's comment
**So that** I can have a conversation with other viewers

**Acceptance Criteria:**
- [ ] User can click "Reply" on any comment
- [ ] Reply form appears below the comment
- [ ] Reply is threaded under parent comment
- [ ] Reply shows parent comment context
- [ ] User can see all replies to a comment
- [ ] Replies are sorted by newest first

---

### Story 3: Edit Comment
**As a** comment author
**I want to** edit my comment
**So that** I can fix typos or update my thoughts

**Acceptance Criteria:**
- [ ] User can click "Edit" on their own comment
- [ ] Edit form appears with current text
- [ ] User can modify text
- [ ] User can save or cancel
- [ ] Comment shows "Edited" label with timestamp
- [ ] Edit history is not visible to others

---

### Story 4: Delete Comment
**As a** comment author
**I want to** delete my comment
**So that** I can remove comments I regret

**Acceptance Criteria:**
- [ ] User can click "Delete" on their own comment
- [ ] Confirmation dialog appears
- [ ] Comment is removed from view
- [ ] Comment count decreases
- [ ] Deleted comment shows "[Deleted]" placeholder

---

### Story 5: Creator Pins Comment
**As a** creator
**I want to** pin important comments to the top
**So that** I can highlight important questions or feedback

**Acceptance Criteria:**
- [ ] Creator can click "Pin" on any comment
- [ ] Pinned comment appears at top of comment section
- [ ] Pinned comment shows "Pinned by creator" badge
- [ ] Creator can unpin comments
- [ ] Only creator can pin/unpin comments
- [ ] Max 3 pinned comments per video

---

### Story 6: Creator Hearts Comment
**As a** creator
**I want to** heart comments I like
**So that** I can show appreciation to engaged viewers

**Acceptance Criteria:**
- [ ] Creator can click heart icon on any comment
- [ ] Heart appears next to comment
- [ ] Comment shows "Creator liked this" badge
- [ ] Creator can unlike comments
- [ ] Only creator can heart comments
- [ ] Hearted comments are highlighted

---

### Story 7: Mention User in Comment
**As a** commenter
**I want to** mention other users with @username
**So that** I can direct my comment to specific people

**Acceptance Criteria:**
- [ ] User can type @ to trigger mention autocomplete
- [ ] Autocomplete shows matching usernames
- [ ] User can select a username
- [ ] Mention is highlighted in comment
- [ ] Mentioned user receives notification
- [ ] Mention links to user profile

---

### Story 8: View Comment Moderation Queue
**As a** moderator
**I want to** review flagged comments
**So that** I can remove inappropriate content

**Acceptance Criteria:**
- [ ] Moderator can access moderation queue
- [ ] Queue shows flagged comments with reason
- [ ] Moderator can approve or reject comments
- [ ] Rejected comments are hidden
- [ ] Moderator can add custom rejection reason
- [ ] Moderation actions are logged

---

### Story 9: Flag Comment as Inappropriate
**As a** viewer
**I want to** flag inappropriate comments
**So that** moderators can review them

**Acceptance Criteria:**
- [ ] User can click "Report" on any comment
- [ ] Report form appears with reason options
- [ ] Reason options: Spam, Harassment, Hate speech, Misinformation, Other
- [ ] User can add custom reason
- [ ] Report is submitted
- [ ] User sees confirmation message
- [ ] Comment is not removed immediately (pending review)

---

### Story 10: Sort Comments
**As a** viewer
**I want to** sort comments by newest, oldest, or top
**So that** I can find the most relevant comments

**Acceptance Criteria:**
- [ ] Sort dropdown appears above comments
- [ ] Options: Newest first, Oldest first, Top comments
- [ ] "Top comments" sorts by likes/hearts
- [ ] Sort preference is remembered
- [ ] Comments re-sort when option changes

---

## Functional Requirements

### Comment Creation
- Max 5000 characters per comment
- Support markdown formatting (bold, italic, links)
- Auto-link detection (URLs become clickable)
- Emoji support
- GIF support (via Giphy API)
- Mention support (@username)
- Hashtag support (#topic)

### Comment Display
- Show user avatar, name, timestamp
- Show comment text with formatting
- Show reply count
- Show like/heart count
- Show "Edited" label if modified
- Show "Pinned by creator" badge if pinned
- Show "Creator liked this" badge if hearted
- Show parent comment context for replies

### Comment Moderation
- Flag comments as inappropriate
- Moderation queue for admins
- Auto-hide comments with multiple flags
- Creator can delete any comment on their video
- User can delete their own comments
- Soft delete (show "[Deleted]" placeholder)

### Comment Threading
- Replies nested under parent comment
- Max 3 levels of nesting (reply to reply to reply)
- Collapse/expand reply threads
- Show reply count on parent comment
- Load more replies if >5 replies

### Comment Notifications
- Notify user when comment is replied to
- Notify creator when video is commented on
- Notify mentioned users
- Notify creator when comment is reported
- Notification preferences (email, push, in-app)

---

## Non-Functional Requirements

### Performance
- Comments load in <500ms
- Comment submission completes in <1s
- Moderation queue loads in <2s
- Support 1000+ comments per video

### Scalability
- Handle 100+ concurrent commenters
- Handle 10,000+ comments per video
- Archive old comments (>1 year)

### Security
- Sanitize all user input (XSS prevention)
- Rate limit comments (max 10 per minute per user)
- Prevent spam (duplicate comment detection)
- Validate all inputs server-side

### Accessibility
- Keyboard navigation for all actions
- Screen reader support
- High contrast mode support
- ARIA labels for all interactive elements

---

## Data Model

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

CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
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

### Comment Hearts Table (Creator only)
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

## API Endpoints

### Create Comment
```
POST /api/comments
Body: {
  video_id: UUID,
  parent_comment_id?: UUID,
  content: string (max 5000 chars)
}
Response: {
  id: UUID,
  video_id: UUID,
  user_id: UUID,
  content: string,
  created_at: timestamp,
  user: { id, name, avatar_url }
}
```

### Get Comments for Video
```
GET /api/videos/{video_id}/comments?sort=newest&limit=20&offset=0
Response: {
  comments: [
    {
      id: UUID,
      video_id: UUID,
      user_id: UUID,
      content: string,
      created_at: timestamp,
      is_pinned: boolean,
      is_deleted: boolean,
      reply_count: number,
      like_count: number,
      user: { id, name, avatar_url },
      replies: [...]
    }
  ],
  total: number,
  has_more: boolean
}
```

### Update Comment
```
PATCH /api/comments/{comment_id}
Body: {
  content: string
}
Response: { id, content, edited_at, ... }
```

### Delete Comment
```
DELETE /api/comments/{comment_id}
Response: { success: true }
```

### Pin Comment
```
POST /api/comments/{comment_id}/pin
Response: { id, is_pinned: true }
```

### Heart Comment
```
POST /api/comments/{comment_id}/heart
Response: { id, is_hearted: true }
```

### Flag Comment
```
POST /api/comments/{comment_id}/flag
Body: {
  reason: string,
  custom_reason?: string
}
Response: { id, flagged: true }
```

### Get Moderation Queue
```
GET /api/admin/comments/moderation-queue?status=pending&limit=20
Response: {
  flags: [
    {
      id: UUID,
      comment: { id, content, user: {...} },
      reason: string,
      flag_count: number,
      created_at: timestamp
    }
  ]
}
```

### Review Flagged Comment
```
POST /api/admin/comments/{flag_id}/review
Body: {
  action: 'approve' | 'reject',
  reason?: string
}
Response: { success: true }
```

---

## UI Components

### CommentThread.tsx
- Display single comment with replies
- Show user info, timestamp, content
- Show action buttons (reply, like, flag, etc.)
- Show pinned/hearted badges
- Collapse/expand replies

### CommentForm.tsx
- Text input with markdown support
- Character counter
- Mention autocomplete
- Emoji picker
- GIF picker
- Submit button
- Cancel button

### CommentList.tsx
- Display all comments for video
- Sort dropdown
- Load more button
- Infinite scroll option
- Pinned comments at top

### CommentActions.tsx
- Reply button
- Like button
- Flag button
- Edit button (if author)
- Delete button (if author or creator)
- Pin button (if creator)
- Heart button (if creator)

### ModerationQueue.tsx
- List of flagged comments
- Approve/reject buttons
- Custom reason input
- Filter by status
- Pagination

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Comments per video | 5+ | Average comments per video |
| Comment engagement | 30%+ | % of viewers who comment |
| Moderation accuracy | 95%+ | Correct moderation decisions |
| Comment load time | <500ms | API response time |
| Comment submission time | <1s | Time from submit to display |

---

## Timeline

- **Week 1:** Database schema, API endpoints, basic UI
- **Week 2:** Moderation, notifications, testing, deployment

---

## Dependencies

- Supabase (database, auth)
- React (frontend)
- TypeScript (type safety)
- Tailwind CSS (styling)
- Framer Motion (animations)
- React Query (data fetching)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Spam comments | Rate limiting, auto-flagging, moderation queue |
| Harassment | Reporting system, creator moderation tools |
| Performance issues | Pagination, caching, database indexing |
| XSS attacks | Input sanitization, server-side validation |

---

## Future Enhancements

- Comment reactions (emoji reactions)
- Comment translations
- Comment sentiment analysis
- Comment recommendations
- Comment search
- Comment export for creators
- Comment analytics dashboard

