-- 1. Credits on advertisers
ALTER TABLE public.advertisers ADD COLUMN IF NOT EXISTS credits_cents integer NOT NULL DEFAULT 0;

-- 2. Review metadata on campaigns
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.ad_campaigns ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 3. Credit transactions
CREATE TABLE IF NOT EXISTS public.advertiser_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  kind text NOT NULL DEFAULT 'topup',
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advertiser_credit_transactions TO authenticated;
GRANT ALL ON public.advertiser_credit_transactions TO service_role;
ALTER TABLE public.advertiser_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers view own credit history"
ON public.advertiser_credit_transactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = advertiser_id AND a.user_id = auth.uid()));

-- 4. Notifications
CREATE TABLE IF NOT EXISTS public.advertiser_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.advertiser_notifications TO authenticated;
GRANT ALL ON public.advertiser_notifications TO service_role;
ALTER TABLE public.advertiser_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advertisers view own notifications"
ON public.advertiser_notifications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = advertiser_id AND a.user_id = auth.uid()));
CREATE POLICY "Advertisers mark own notifications read"
ON public.advertiser_notifications FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = advertiser_id AND a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = advertiser_id AND a.user_id = auth.uid()));

-- 5. Admin review of campaigns
CREATE POLICY "Admins manage all campaigns"
ON public.ad_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all advertisers"
ON public.advertisers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.review_ad_campaign(p_campaign_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_adv uuid; v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.ad_campaigns
  SET status = CASE WHEN p_approve THEN 'active' ELSE 'rejected' END,
      review_note = p_note,
      reviewed_at = now()
  WHERE id = p_campaign_id
  RETURNING advertiser_id, name INTO v_adv, v_name;

  IF v_adv IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  INSERT INTO public.advertiser_notifications (advertiser_id, campaign_id, title, body)
  VALUES (
    v_adv, p_campaign_id,
    CASE WHEN p_approve THEN 'Campaign approved: ' || v_name ELSE 'Campaign rejected: ' || v_name END,
    COALESCE(p_note, CASE WHEN p_approve THEN 'Your campaign is now live and eligible to serve.' ELSE 'Your campaign did not pass review.' END)
  );
END $$;

-- 6. Credit top-up (recorded server-side)
CREATE OR REPLACE FUNCTION public.add_advertiser_credits(p_amount_cents integer, p_reference text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_adv uuid; v_balance integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT id INTO v_adv FROM public.advertisers WHERE user_id = auth.uid();
  IF v_adv IS NULL THEN RAISE EXCEPTION 'No advertiser account'; END IF;

  UPDATE public.advertisers SET credits_cents = credits_cents + p_amount_cents
  WHERE id = v_adv RETURNING credits_cents INTO v_balance;

  INSERT INTO public.advertiser_credit_transactions (advertiser_id, amount_cents, kind, reference)
  VALUES (v_adv, p_amount_cents, 'topup', p_reference);

  INSERT INTO public.advertiser_notifications (advertiser_id, title, body)
  VALUES (v_adv, 'Credits added', 'Your account was topped up by $' || to_char(p_amount_cents / 100.0, 'FM999999990.00') || '.');

  RETURN v_balance;
END $$;

-- 7. Per-campaign analytics for the calling advertiser
CREATE OR REPLACE FUNCTION public.get_advertiser_campaign_analytics()
RETURNS TABLE(
  campaign_id uuid,
  campaign_name text,
  status text,
  impressions bigint,
  clicks bigint,
  videos_reached bigint,
  spend_cents bigint,
  budget_cents integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.status,
    COUNT(e.id) FILTER (WHERE e.event_type = 'impression'),
    COUNT(e.id) FILTER (WHERE e.event_type = 'click'),
    COUNT(DISTINCT e.video_id),
    COALESCE(SUM(e.revenue_cents), 0),
    c.budget_cents
  FROM public.ad_campaigns c
  JOIN public.advertisers a ON a.id = c.advertiser_id
  LEFT JOIN public.ad_events e ON e.campaign_id = c.id
  WHERE a.user_id = auth.uid()
  GROUP BY c.id, c.name, c.status, c.budget_cents
  ORDER BY c.created_at DESC;
$$;

-- 8. serve_ad honours advertiser credit balance and deducts spend
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

  SELECT p.is_monetized INTO v_monetized FROM public.profiles p WHERE p.user_id = v_creator;
  IF NOT COALESCE(v_monetized, false) THEN RETURN; END IF;

  IF v_is_short OR v_duration < MIN_DURATION_SECONDS THEN RETURN; END IF;
  IF p_ad_type = 'mid_roll' AND v_duration < MIDROLL_MIN_SECONDS THEN RETURN; END IF;

  IF v_viewer IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.ad_events e
    WHERE e.viewer_id = v_viewer
      AND e.video_id = p_video_id
      AND e.event_type = 'impression'
      AND e.created_at > now() - make_interval(mins => FREQUENCY_CAP_MINUTES)
  ) THEN
    RETURN;
  END IF;

  IF v_viewer IS NOT NULL AND v_viewer = v_creator THEN RETURN; END IF;

  SELECT ac.* INTO c FROM public.ad_campaigns ac
  JOIN public.advertisers adv ON adv.id = ac.advertiser_id
  WHERE ac.status = 'active'
    AND ac.ad_type = p_ad_type
    AND ac.starts_at <= now()
    AND (ac.ends_at IS NULL OR ac.ends_at > now())
    AND ac.spent_cents < ac.budget_cents
    AND adv.credits_cents > 0
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

  UPDATE public.advertisers SET credits_cents = GREATEST(0, credits_cents - v_rev)
  WHERE id = c.advertiser_id;

  INSERT INTO public.advertiser_credit_transactions (advertiser_id, amount_cents, kind, reference)
  VALUES (c.advertiser_id, -v_rev, 'spend', c.id::text);

  RETURN QUERY SELECT c.id, c.headline, c.creative_url, c.click_url, c.skip_after_seconds;
END $function$;
