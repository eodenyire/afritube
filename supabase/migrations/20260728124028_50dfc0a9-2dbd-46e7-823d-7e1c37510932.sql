
-- 1. Shorts flag
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_short boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS videos_is_short_idx ON public.videos (is_short) WHERE is_short = true;

-- 2. Make profiles.user_id unique so other tables can FK it (enables PostgREST embeds)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 3. Add FKs so embed syntax profiles(...) works from these tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'videos_user_id_profiles_fkey') THEN
    ALTER TABLE public.videos
      ADD CONSTRAINT videos_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audio_tracks_user_id_profiles_fkey') THEN
    ALTER TABLE public.audio_tracks
      ADD CONSTRAINT audio_tracks_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_user_id_profiles_fkey') THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlists_user_id_profiles_fkey') THEN
    ALTER TABLE public.playlists
      ADD CONSTRAINT playlists_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_user_id_profiles_fkey') THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_streams_creator_id_profiles_fkey') THEN
    ALTER TABLE public.live_streams
      ADD CONSTRAINT live_streams_creator_id_profiles_fkey
      FOREIGN KEY (creator_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Backfill: mark existing short-duration videos as shorts (<= 60s)
UPDATE public.videos SET is_short = true WHERE duration IS NOT NULL AND duration > 0 AND duration <= 60 AND is_short = false;
