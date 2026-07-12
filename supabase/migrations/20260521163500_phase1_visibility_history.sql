DO $$
BEGIN
  CREATE TYPE public.video_visibility AS ENUM ('public', 'unlisted', 'private');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS visibility public.video_visibility NOT NULL DEFAULT 'public';

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;

UPDATE public.videos
SET visibility = CASE
  WHEN is_published = true THEN 'public'::public.video_visibility
  ELSE 'private'::public.video_visibility
END
WHERE visibility IS DISTINCT FROM CASE
  WHEN is_published = true THEN 'public'::public.video_visibility
  ELSE 'private'::public.video_visibility
END;

CREATE OR REPLACE FUNCTION public.sync_video_publication_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_published := (
    NEW.visibility = 'public'
    AND (NEW.publish_at IS NULL OR NEW.publish_at <= now())
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_video_publication_state_trigger ON public.videos;
CREATE TRIGGER sync_video_publication_state_trigger
BEFORE INSERT OR UPDATE OF visibility, publish_at ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.sync_video_publication_state();

UPDATE public.videos
SET is_published = (
  visibility = 'public'
  AND (publish_at IS NULL OR publish_at <= now())
)
WHERE is_published IS DISTINCT FROM (
  visibility = 'public'
  AND (publish_at IS NULL OR publish_at <= now())
);

DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
DROP POLICY IF EXISTS "Videos visibility-aware read access" ON public.videos;
CREATE POLICY "Videos visibility-aware read access"
ON public.videos
FOR SELECT
USING (
  (
    visibility IN ('public', 'unlisted')
    AND (publish_at IS NULL OR publish_at <= now())
  )
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Watch history is viewable by everyone" ON public.watch_history;
DROP POLICY IF EXISTS "Watch history owners and creators can view" ON public.watch_history;
CREATE POLICY "Watch history owners and creators can view"
ON public.watch_history
FOR SELECT
TO authenticated
USING (auth.uid() = viewer_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Watch history owners can delete" ON public.watch_history;
CREATE POLICY "Watch history owners can delete"
ON public.watch_history
FOR DELETE
TO authenticated
USING (auth.uid() = viewer_id);

CREATE OR REPLACE FUNCTION public.get_user_mix(
  p_viewer_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  video_id uuid,
  score bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH history_ranked AS (
    SELECT
      wh.video_id,
      SUM(wh.watch_seconds)::bigint AS score
    FROM public.watch_history wh
    JOIN public.videos v
      ON v.id = wh.video_id
    WHERE wh.viewer_id = p_viewer_id
      AND v.visibility IN ('public', 'unlisted')
      AND (v.publish_at IS NULL OR v.publish_at <= now())
    GROUP BY wh.video_id
  ),
  history_limited AS (
    SELECT
      hr.video_id,
      hr.score
    FROM history_ranked hr
    ORDER BY hr.score DESC, hr.video_id
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50))
  ),
  needed AS (
    SELECT GREATEST(0, GREATEST(1, LEAST(COALESCE(p_limit, 20), 50)) - COUNT(*)) AS remaining
    FROM history_limited
  ),
  popular_fallback AS (
    SELECT
      v.id AS video_id,
      v.views::bigint AS score
    FROM public.videos v
    WHERE v.visibility IN ('public', 'unlisted')
      AND (v.publish_at IS NULL OR v.publish_at <= now())
      AND NOT EXISTS (
        SELECT 1
        FROM history_limited hl
        WHERE hl.video_id = v.id
      )
    ORDER BY v.views DESC, v.created_at DESC
    LIMIT (SELECT remaining FROM needed)
  )
  SELECT video_id, score FROM history_limited
  UNION ALL
  SELECT video_id, score FROM popular_fallback;
$$;
