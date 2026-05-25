CREATE OR REPLACE FUNCTION public.get_recommended_videos(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  video_id uuid,
  score numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH bounded AS (
    SELECT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50)) AS limit_value
  ),
  user_signals AS (
    SELECT
      re.video_id,
      SUM(
        CASE re.event_type
          WHEN 'watch_complete' THEN 8
          WHEN 'watch_start' THEN 3
          WHEN 'search_result_click' THEN 5
          ELSE 0
        END
      )::numeric AS direct_signal
    FROM public.recommendation_events re
    WHERE re.user_id = p_user_id
      AND re.video_id IS NOT NULL
      AND re.created_at >= now() - interval '90 days'
    GROUP BY re.video_id
  ),
  category_affinity AS (
    SELECT
      v.category,
      SUM(us.direct_signal)::numeric AS category_signal
    FROM user_signals us
    JOIN public.videos v
      ON v.id = us.video_id
    GROUP BY v.category
  ),
  candidates AS (
    SELECT
      v.id AS video_id,
      COALESCE(us.direct_signal, 0) * 10
      + COALESCE(ca.category_signal, 0) * 2
      + LN(GREATEST(v.views, 1)) AS score
    FROM public.videos v
    LEFT JOIN user_signals us
      ON us.video_id = v.id
    LEFT JOIN category_affinity ca
      ON ca.category = v.category
    WHERE v.processing_status = 'ready'
      AND v.visibility IN ('public', 'unlisted')
      AND (v.publish_at IS NULL OR v.publish_at <= now())
  )
  SELECT c.video_id, c.score
  FROM candidates c
  ORDER BY c.score DESC, c.video_id
  LIMIT (SELECT limit_value FROM bounded);
$$;
