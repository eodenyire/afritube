-- Comments System Migration
-- Created: 2026-05-25
-- Purpose: Add comments, moderation, and engagement features to AfriTube

-- ============================================================================
-- 1. COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
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
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_is_pinned ON comments(is_pinned) WHERE NOT is_deleted;

-- ============================================================================
-- 2. COMMENT FLAGS TABLE (for moderation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason VARCHAR NOT NULL,
  custom_reason TEXT,
  status VARCHAR DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_flag_per_user_comment UNIQUE(comment_id, user_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_comment_flags_status ON comment_flags(status);
CREATE INDEX IF NOT EXISTS idx_comment_flags_created_at ON comment_flags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_flags_comment_id ON comment_flags(comment_id);

-- ============================================================================
-- 3. COMMENT LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_like_per_user_comment UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- ============================================================================
-- 4. COMMENT HEARTS TABLE (Creator only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_hearts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_heart_per_creator_comment UNIQUE(comment_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_hearts_comment_id ON comment_hearts(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_hearts_creator_id ON comment_hearts(creator_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_hearts ENABLE ROW LEVEL SECURITY;

-- Comments: Anyone can read, authenticated users can create
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM videos WHERE id = comments.video_id
  ));

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM videos WHERE id = comments.video_id
  ));

-- Comment Flags: Anyone can create, admins can review
CREATE POLICY "Comment flags are viewable by admins" ON comment_flags
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  ));

CREATE POLICY "Users can flag comments" ON comment_flags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update flags" ON comment_flags
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  ));

-- Comment Likes: Anyone can read, authenticated users can create/delete
CREATE POLICY "Comment likes are viewable by everyone" ON comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like comments" ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" ON comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Comment Hearts: Anyone can read, creators can create/delete
CREATE POLICY "Comment hearts are viewable by everyone" ON comment_hearts
  FOR SELECT USING (true);

CREATE POLICY "Creators can heart comments" ON comment_hearts
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can unheart comments" ON comment_hearts
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get comment count for a video
CREATE OR REPLACE FUNCTION get_comment_count(p_video_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comments 
  WHERE video_id = p_video_id AND NOT is_deleted;
$$ LANGUAGE SQL STABLE;

-- Function to get reply count for a comment
CREATE OR REPLACE FUNCTION get_reply_count(p_comment_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comments 
  WHERE parent_comment_id = p_comment_id AND NOT is_deleted;
$$ LANGUAGE SQL STABLE;

-- Function to get like count for a comment
CREATE OR REPLACE FUNCTION get_comment_like_count(p_comment_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comment_likes 
  WHERE comment_id = p_comment_id;
$$ LANGUAGE SQL STABLE;

-- Function to check if user liked a comment
CREATE OR REPLACE FUNCTION user_liked_comment(p_comment_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM comment_likes 
    WHERE comment_id = p_comment_id AND user_id = p_user_id
  );
$$ LANGUAGE SQL STABLE;

-- Function to check if creator hearted a comment
CREATE OR REPLACE FUNCTION creator_hearted_comment(p_comment_id UUID, p_creator_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM comment_hearts 
    WHERE comment_id = p_comment_id AND creator_id = p_creator_id
  );
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Update comments.updated_at on any change
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at_trigger
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_updated_at();

-- Auto-hide comments with 5+ flags
CREATE OR REPLACE FUNCTION auto_hide_flagged_comments()
RETURNS TRIGGER AS $$
DECLARE
  flag_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO flag_count FROM comment_flags 
  WHERE comment_id = NEW.comment_id AND status = 'pending';
  
  IF flag_count >= 5 THEN
    UPDATE comments SET is_deleted = TRUE WHERE id = NEW.comment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_hide_flagged_comments_trigger
AFTER INSERT ON comment_flags
FOR EACH ROW
EXECUTE FUNCTION auto_hide_flagged_comments();

-- ============================================================================
-- 8. VIEWS
-- ============================================================================

-- View for comments with all related data
CREATE OR REPLACE VIEW comments_with_details AS
SELECT 
  c.id,
  c.video_id,
  c.user_id,
  c.parent_comment_id,
  c.content,
  c.is_pinned,
  c.is_deleted,
  c.created_at,
  c.updated_at,
  c.edited_at,
  p.display_name as user_name,
  p.avatar_url as user_avatar,
  get_reply_count(c.id) as reply_count,
  get_comment_like_count(c.id) as like_count,
  (SELECT COUNT(*) FROM comment_hearts WHERE comment_id = c.id) as heart_count,
  (SELECT COUNT(*) FROM comment_flags WHERE comment_id = c.id AND status = 'pending') as flag_count
FROM comments c
LEFT JOIN profiles p ON c.user_id = p.user_id
WHERE NOT c.is_deleted;

-- View for moderation queue
CREATE OR REPLACE VIEW moderation_queue AS
SELECT 
  cf.id as flag_id,
  c.id as comment_id,
  c.content,
  c.user_id,
  p.display_name as user_name,
  p.avatar_url as user_avatar,
  c.video_id,
  v.title as video_title,
  cf.reason,
  cf.custom_reason,
  cf.status,
  COUNT(*) OVER (PARTITION BY c.id) as total_flags,
  cf.created_at
FROM comment_flags cf
JOIN comments c ON cf.comment_id = c.id
JOIN profiles p ON c.user_id = p.user_id
JOIN videos v ON c.video_id = v.id
WHERE cf.status = 'pending'
ORDER BY cf.created_at DESC;

-- ============================================================================
-- 9. GRANTS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON comments TO authenticated;
GRANT INSERT ON comments TO authenticated;
GRANT UPDATE ON comments TO authenticated;
GRANT DELETE ON comments TO authenticated;

GRANT SELECT ON comment_flags TO authenticated;
GRANT INSERT ON comment_flags TO authenticated;

GRANT SELECT ON comment_likes TO authenticated;
GRANT INSERT ON comment_likes TO authenticated;
GRANT DELETE ON comment_likes TO authenticated;

GRANT SELECT ON comment_hearts TO authenticated;
GRANT INSERT ON comment_hearts TO authenticated;
GRANT DELETE ON comment_hearts TO authenticated;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION get_comment_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_reply_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_like_count TO authenticated;
GRANT EXECUTE ON FUNCTION user_liked_comment TO authenticated;
GRANT EXECUTE ON FUNCTION creator_hearted_comment TO authenticated;

-- Grant permissions to views
GRANT SELECT ON comments_with_details TO authenticated;
GRANT SELECT ON moderation_queue TO authenticated;

-- ============================================================================
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE 'comment%';

-- Verify indexes were created
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' AND tablename LIKE 'comment%';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename LIKE 'comment%';

