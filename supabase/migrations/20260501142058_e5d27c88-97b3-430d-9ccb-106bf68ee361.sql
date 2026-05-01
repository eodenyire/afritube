-- Playlist type enum
DO $$ BEGIN
  CREATE TYPE public.playlist_type AS ENUM ('album','ep','compilation','custom','watch_later');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  playlist_type public.playlist_type NOT NULL DEFAULT 'custom',
  is_public boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  video_id uuid,
  audio_id uuid,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playlist_items_one_target CHECK (
    (video_id IS NOT NULL)::int + (audio_id IS NOT NULL)::int = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS playlist_items_unique_video
  ON public.playlist_items (playlist_id, video_id) WHERE video_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS playlist_items_unique_audio
  ON public.playlist_items (playlist_id, audio_id) WHERE audio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS playlist_items_playlist_pos
  ON public.playlist_items (playlist_id, position);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Playlist policies
DROP POLICY IF EXISTS "Public playlists viewable" ON public.playlists;
CREATE POLICY "Public playlists viewable" ON public.playlists
  FOR SELECT TO public
  USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner inserts playlists" ON public.playlists;
CREATE POLICY "Owner inserts playlists" ON public.playlists
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner updates playlists" ON public.playlists;
CREATE POLICY "Owner updates playlists" ON public.playlists
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner deletes playlists" ON public.playlists;
CREATE POLICY "Owner deletes playlists" ON public.playlists
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Playlist items policies
DROP POLICY IF EXISTS "Items viewable when playlist viewable" ON public.playlist_items;
CREATE POLICY "Items viewable when playlist viewable" ON public.playlist_items
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_id AND (p.is_public = true OR auth.uid() = p.user_id)
  ));

DROP POLICY IF EXISTS "Owner manages items" ON public.playlist_items;
CREATE POLICY "Owner manages items" ON public.playlist_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()
  ));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPCs
CREATE OR REPLACE FUNCTION public.create_playlist(
  p_title text,
  p_description text DEFAULT NULL,
  p_cover_url text DEFAULT NULL,
  p_playlist_type public.playlist_type DEFAULT 'custom'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.playlists (user_id, title, description, cover_url, playlist_type)
  VALUES (auth.uid(), p_title, p_description, p_cover_url, p_playlist_type)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.add_video_to_playlist(p_playlist_id uuid, p_video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE next_pos int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.playlists WHERE id = p_playlist_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  SELECT COALESCE(MAX(position), -1) + 1 INTO next_pos FROM public.playlist_items WHERE playlist_id = p_playlist_id;
  INSERT INTO public.playlist_items (playlist_id, video_id, position)
  VALUES (p_playlist_id, p_video_id, next_pos)
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.remove_video_from_playlist(p_playlist_id uuid, p_video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.playlists WHERE id = p_playlist_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  DELETE FROM public.playlist_items WHERE playlist_id = p_playlist_id AND video_id = p_video_id;
END $$;

CREATE OR REPLACE FUNCTION public.reorder_playlist_items(p_playlist_id uuid, p_video_id uuid, p_new_position int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.playlists WHERE id = p_playlist_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.playlist_items SET position = p_new_position
  WHERE playlist_id = p_playlist_id AND video_id = p_video_id;
END $$;