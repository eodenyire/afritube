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
      AND v.is_published = true
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
    WHERE v.is_published = true
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
