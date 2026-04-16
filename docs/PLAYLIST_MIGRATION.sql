-- Playlist Feature Migration for AfriTube
-- Adds support for albums, playlists, and collections

-- 1. Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  playlist_type TEXT NOT NULL DEFAULT 'custom' CHECK (playlist_type IN ('album', 'ep', 'compilation', 'custom', 'watch_later')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create playlist_items table (junction table for videos in playlists)
CREATE TABLE IF NOT EXISTS playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position INT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, video_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_video_id ON playlist_items(video_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON playlist_items(playlist_id, position);

-- 4. Enable RLS on playlists
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: Users can view all published playlists and their own playlists
CREATE POLICY "playlists_select_policy" ON playlists
  FOR SELECT
  USING (is_published = true OR auth.uid() = user_id);

-- 6. RLS Policy: Users can only insert their own playlists
CREATE POLICY "playlists_insert_policy" ON playlists
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. RLS Policy: Users can only update their own playlists
CREATE POLICY "playlists_update_policy" ON playlists
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. RLS Policy: Users can only delete their own playlists
CREATE POLICY "playlists_delete_policy" ON playlists
  FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Enable RLS on playlist_items
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policy: Users can view items in published playlists or their own playlists
CREATE POLICY "playlist_items_select_policy" ON playlist_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_items.playlist_id
      AND (playlists.is_published = true OR auth.uid() = playlists.user_id)
    )
  );

-- 11. RLS Policy: Users can only insert items into their own playlists
CREATE POLICY "playlist_items_insert_policy" ON playlist_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_items.playlist_id
      AND auth.uid() = playlists.user_id
    )
  );

-- 12. RLS Policy: Users can only update items in their own playlists
CREATE POLICY "playlist_items_update_policy" ON playlist_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_items.playlist_id
      AND auth.uid() = playlists.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_items.playlist_id
      AND auth.uid() = playlists.user_id
    )
  );

-- 13. RLS Policy: Users can only delete items from their own playlists
CREATE POLICY "playlist_items_delete_policy" ON playlist_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_items.playlist_id
      AND auth.uid() = playlists.user_id
    )
  );

-- 14. Trigger to update playlists.updated_at
CREATE OR REPLACE FUNCTION update_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlists_updated_at_trigger
BEFORE UPDATE ON playlists
FOR EACH ROW
EXECUTE FUNCTION update_playlists_updated_at();

-- 15. RPC Function: Create a new playlist
CREATE OR REPLACE FUNCTION create_playlist(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_cover_url TEXT DEFAULT NULL,
  p_playlist_type TEXT DEFAULT 'custom'
)
RETURNS UUID AS $$
DECLARE
  v_playlist_id UUID;
BEGIN
  INSERT INTO playlists (user_id, title, description, cover_url, playlist_type)
  VALUES (auth.uid(), p_title, p_description, p_cover_url, p_playlist_type)
  RETURNING id INTO v_playlist_id;
  RETURN v_playlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. RPC Function: Add video to playlist
CREATE OR REPLACE FUNCTION add_video_to_playlist(
  p_playlist_id UUID,
  p_video_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_next_position INT;
BEGIN
  -- Get the next position
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
  FROM playlist_items
  WHERE playlist_id = p_playlist_id;

  -- Insert the video
  INSERT INTO playlist_items (playlist_id, video_id, position)
  VALUES (p_playlist_id, p_video_id, v_next_position)
  ON CONFLICT (playlist_id, video_id) DO NOTHING;

  -- Update playlist updated_at
  UPDATE playlists SET updated_at = now() WHERE id = p_playlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. RPC Function: Remove video from playlist
CREATE OR REPLACE FUNCTION remove_video_from_playlist(
  p_playlist_id UUID,
  p_video_id UUID
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM playlist_items
  WHERE playlist_id = p_playlist_id AND video_id = p_video_id;

  -- Update playlist updated_at
  UPDATE playlists SET updated_at = now() WHERE id = p_playlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. RPC Function: Reorder playlist items
CREATE OR REPLACE FUNCTION reorder_playlist_items(
  p_playlist_id UUID,
  p_video_id UUID,
  p_new_position INT
)
RETURNS VOID AS $$
DECLARE
  v_old_position INT;
BEGIN
  -- Get current position
  SELECT position INTO v_old_position
  FROM playlist_items
  WHERE playlist_id = p_playlist_id AND video_id = p_video_id;

  IF v_old_position IS NULL THEN
    RAISE EXCEPTION 'Video not found in playlist';
  END IF;

  -- If moving down, shift items up
  IF p_new_position > v_old_position THEN
    UPDATE playlist_items
    SET position = position - 1
    WHERE playlist_id = p_playlist_id
      AND position > v_old_position
      AND position <= p_new_position;
  -- If moving up, shift items down
  ELSIF p_new_position < v_old_position THEN
    UPDATE playlist_items
    SET position = position + 1
    WHERE playlist_id = p_playlist_id
      AND position < v_old_position
      AND position >= p_new_position;
  END IF;

  -- Update the video's position
  UPDATE playlist_items
  SET position = p_new_position
  WHERE playlist_id = p_playlist_id AND video_id = p_video_id;

  -- Update playlist updated_at
  UPDATE playlists SET updated_at = now() WHERE id = p_playlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
