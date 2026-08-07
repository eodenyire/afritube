
CREATE OR REPLACE FUNCTION public.serve_ad(p_video_id uuid, p_category text DEFAULT NULL::text, p_ad_type text DEFAULT 'pre_roll'::text)
 RETURNS TABLE(campaign_id uuid, headline text, creative_url text, click_url text, skip_after_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator uuid;
  v_monetized boolean;
  v_duration int;
  v_is_short boolean;
  v_category text;
  v_viewer uuid := auth.uid();
  c record;
  v_rev int;
  MIN_DURATION_SECONDS constant int := 60;
  MIDROLL_MIN_SECONDS constant int := 480;
  FREQUENCY_CAP_MINUTES constant int := 30;
BEGIN
  SELECT v.user_id, COALESCE(v.duration, 0), COALESCE(v.is_short, false), v.category
    INTO v_creator, v_duration, v_is_short, v_category
  FROM public.videos v WHERE v.id = p_video_id;

  IF v_creator IS NULL THEN RETURN; END IF;

  -- Rule 1: creator must be monetized
  SELECT p.is_monetized INTO v_monetized FROM public.profiles p WHERE p.user_id = v_creator;
  IF NOT COALESCE(v_monetized, false) THEN RETURN; END IF;

  -- Rule 2: never advertise on Shorts or very short videos
  IF v_is_short OR v_duration < MIN_DURATION_SECONDS THEN RETURN; END IF;

  -- Rule 3: mid-rolls only on long-form videos
  IF p_ad_type = 'mid_roll' AND v_duration < MIDROLL_MIN_SECONDS THEN RETURN; END IF;

  -- Rule 4: frequency cap — one ad per signed-in viewer per video per window
  IF v_viewer IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ad_events e
    WHERE e.viewer_id = v_viewer
      AND e.video_id = p_video_id
      AND e.event_type = 'impression'
      AND e.created_at > now() - make_interval(mins => FREQUENCY_CAP_MINUTES)
  ) THEN
    RETURN;
  END IF;

  -- Never show the creator ads on their own video
  IF v_viewer IS NOT NULL AND v_viewer = v_creator THEN RETURN; END IF;

  SELECT * INTO c FROM public.ad_campaigns ac
  WHERE ac.status = 'active'
    AND ac.ad_type = p_ad_type
    AND ac.starts_at <= now()
    AND (ac.ends_at IS NULL OR ac.ends_at > now())
    AND ac.spent_cents < ac.budget_cents
    AND (
      cardinality(ac.target_categories) = 0
      OR COALESCE(p_category, v_category) IS NULL
      OR COALESCE(p_category, v_category) = ANY(ac.target_categories)
    )
  ORDER BY ac.cpm_cents DESC, random()
  LIMIT 1;

  IF c.id IS NULL THEN RETURN; END IF;

  v_rev := GREATEST(1, (c.cpm_cents / 1000));
  INSERT INTO public.ad_events (campaign_id, video_id, creator_id, viewer_id, event_type, revenue_cents, creator_share_cents)
  VALUES (c.id, p_video_id, v_creator, v_viewer, 'impression', v_rev, ROUND(v_rev * 0.55));

  UPDATE public.ad_campaigns SET spent_cents = spent_cents + v_rev,
    status = CASE WHEN spent_cents + v_rev >= budget_cents THEN 'completed' ELSE status END
  WHERE id = c.id;

  RETURN QUERY SELECT c.id, c.headline, c.creative_url, c.click_url, c.skip_after_seconds;
END $function$;

CREATE OR REPLACE FUNCTION public.get_creator_earnings()
 RETURNS TABLE(
   impressions bigint,
   clicks bigint,
   ad_earnings_cents bigint,
   super_chat_cents bigint,
   total_cents bigint
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT COUNT(*) FROM public.ad_events WHERE creator_id = auth.uid() AND event_type = 'impression'),
    (SELECT COUNT(*) FROM public.ad_events WHERE creator_id = auth.uid() AND event_type = 'click'),
    (SELECT COALESCE(SUM(creator_share_cents), 0) FROM public.ad_events WHERE creator_id = auth.uid()),
    (SELECT COALESCE(SUM(ROUND(sc.amount_usd * 100) * 0.7), 0)::bigint
       FROM public.live_super_chats sc
       JOIN public.live_streams s ON s.id = sc.stream_id
      WHERE s.creator_id = auth.uid()),
    (SELECT COALESCE(SUM(creator_share_cents), 0) FROM public.ad_events WHERE creator_id = auth.uid())
    + (SELECT COALESCE(SUM(ROUND(sc.amount_usd * 100) * 0.7), 0)::bigint
       FROM public.live_super_chats sc
       JOIN public.live_streams s ON s.id = sc.stream_id
      WHERE s.creator_id = auth.uid());
$function$;
