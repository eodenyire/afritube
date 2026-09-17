
CREATE TABLE IF NOT EXISTS public.monetization_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  subscriber_count_at_apply integer NOT NULL DEFAULT 0,
  watch_hours_at_apply numeric NOT NULL DEFAULT 0,
  note text,
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monetization_applications_status_check CHECK (status IN ('pending','approved','rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS monetization_applications_one_pending
  ON public.monetization_applications (user_id) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.monetization_applications TO authenticated;
GRANT ALL ON public.monetization_applications TO service_role;

ALTER TABLE public.monetization_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own applications readable" ON public.monetization_applications;
CREATE POLICY "own applications readable" ON public.monetization_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creators create own applications" ON public.monetization_applications;
CREATE POLICY "creators create own applications" ON public.monetization_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admins review applications" ON public.monetization_applications;
CREATE POLICY "admins review applications" ON public.monetization_applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.apply_for_monetization(_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  subs int; hours numeric; new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT subscriber_count, watch_hours INTO subs, hours FROM public.profiles WHERE user_id = uid;
  IF subs IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.monetization_applications WHERE user_id = uid AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have an application under review';
  END IF;
  IF EXISTS (SELECT 1 FROM public.monetization_applications WHERE user_id = uid AND status = 'approved') THEN
    RAISE EXCEPTION 'Your monetization is already approved';
  END IF;
  INSERT INTO public.monetization_applications (user_id, subscriber_count_at_apply, watch_hours_at_apply, note)
  VALUES (uid, COALESCE(subs,0), COALESCE(hours,0), NULLIF(btrim(COALESCE(_note,'')),''))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_monetization_application(_application_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  target uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.monetization_applications
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      review_note = NULLIF(btrim(COALESCE(_note,'')),''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _application_id AND status = 'pending'
  RETURNING user_id INTO target;
  IF target IS NULL THEN RAISE EXCEPTION 'Application not found or already reviewed'; END IF;
  IF NOT _approve THEN
    UPDATE public.profiles SET is_monetized = false WHERE user_id = target;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_monetization_applications(_status text DEFAULT 'pending')
RETURNS TABLE (
  id uuid, user_id uuid, display_name text, avatar_url text,
  status text, subscriber_count integer, watch_hours numeric,
  subscriber_count_at_apply integer, watch_hours_at_apply numeric,
  note text, review_note text, is_monetized boolean, created_at timestamptz, reviewed_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
  SELECT a.id, a.user_id, p.display_name, p.avatar_url, a.status,
         COALESCE(p.subscriber_count,0), COALESCE(p.watch_hours,0),
         a.subscriber_count_at_apply, a.watch_hours_at_apply,
         a.note, a.review_note, COALESCE(p.is_monetized,false), a.created_at, a.reviewed_at
  FROM public.monetization_applications a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  WHERE _status IS NULL OR a.status = _status
  ORDER BY a.created_at DESC
  LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION public.enable_creator_ads()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  subs int; hours numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT subscriber_count, watch_hours INTO subs, hours FROM public.profiles WHERE user_id = uid;
  IF subs IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF subs < 100 OR hours < 1000 THEN
    RAISE EXCEPTION 'Not eligible: requires 100 subscribers and 1000 watch hours (current: % subs, % hours)', subs, hours;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.monetization_applications WHERE user_id = uid AND status = 'approved') THEN
    RAISE EXCEPTION 'Your monetization application must be approved first';
  END IF;
  UPDATE public.profiles SET is_monetized = true WHERE user_id = uid;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_ad_dashboard()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  campaigns jsonb;
  vids jsonb;
  totals jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'impressions' DESC), '[]'::jsonb) INTO campaigns
  FROM (
    SELECT to_jsonb(t) AS x FROM (
      SELECT c.id AS campaign_id, c.name AS campaign_name, c.ad_type, c.status,
             COUNT(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
             COUNT(*) FILTER (WHERE e.event_type = 'impression' AND e.created_at > now() - interval '1 hour') AS impressions_last_hour,
             COALESCE(SUM(e.creator_share_cents), 0) AS creator_share_cents
      FROM public.ad_events e
      JOIN public.ad_campaigns c ON c.id = e.campaign_id
      WHERE e.creator_id = uid
      GROUP BY c.id, c.name, c.ad_type, c.status
    ) t
  ) s;

  SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY (v).midroll_eligible DESC, (v).impressions DESC), '[]'::jsonb) INTO vids
  FROM (
    SELECT vv.id AS video_id, vv.title, COALESCE(vv.duration,0) AS duration,
           (COALESCE(vv.duration,0) >= 480 AND COALESCE(vv.is_short,false) = false) AS midroll_eligible,
           (SELECT COUNT(*) FROM public.ad_events e WHERE e.video_id = vv.id AND e.event_type = 'impression') AS impressions
    FROM public.videos vv
    WHERE vv.user_id = uid AND COALESCE(vv.is_published, true)
    ORDER BY vv.created_at DESC
    LIMIT 50
  ) v;

  SELECT jsonb_build_object(
    'impressions_total', COUNT(*) FILTER (WHERE event_type = 'impression'),
    'impressions_today', COUNT(*) FILTER (WHERE event_type = 'impression' AND created_at > now() - interval '24 hours'),
    'creator_share_cents', COALESCE(SUM(creator_share_cents), 0)
  ) INTO totals
  FROM public.ad_events WHERE creator_id = uid;

  RETURN jsonb_build_object('campaigns', campaigns, 'videos', vids, 'totals', COALESCE(totals, '{}'::jsonb));
END;
$$;
