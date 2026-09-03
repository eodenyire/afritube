ALTER TABLE public.advertisers
  ADD COLUMN IF NOT EXISTS low_balance_threshold_cents integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS low_balance_email_alerts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_balance_notified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS advertiser_credit_tx_topup_ref_uidx
  ON public.advertiser_credit_transactions (reference)
  WHERE kind = 'topup' AND reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.notify_low_balance(p_advertiser_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE a record;
BEGIN
  SELECT id, credits_cents, low_balance_threshold_cents, low_balance_notified_at
    INTO a FROM public.advertisers WHERE id = p_advertiser_id;
  IF a.id IS NULL THEN RETURN; END IF;

  IF a.credits_cents < a.low_balance_threshold_cents
     AND (a.low_balance_notified_at IS NULL OR a.low_balance_notified_at < now() - interval '1 day') THEN
    INSERT INTO public.advertiser_notifications (advertiser_id, title, body)
    VALUES (a.id, 'Low credit balance',
      'Your balance is $' || to_char(a.credits_cents / 100.0, 'FM999999990.00') ||
      ', below your alert threshold of $' || to_char(a.low_balance_threshold_cents / 100.0, 'FM999999990.00') ||
      '. Top up to keep your campaigns running.');
    UPDATE public.advertisers SET low_balance_notified_at = now() WHERE id = a.id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.add_advertiser_credits(p_amount_cents integer, p_reference text DEFAULT NULL::text)
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

  IF p_reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.advertiser_credit_transactions
    WHERE kind = 'topup' AND reference = p_reference
  ) THEN
    SELECT credits_cents INTO v_balance FROM public.advertisers WHERE id = v_adv;
    RETURN v_balance;
  END IF;

  INSERT INTO public.advertiser_credit_transactions (advertiser_id, amount_cents, kind, reference)
  VALUES (v_adv, p_amount_cents, 'topup', p_reference);

  UPDATE public.advertisers SET credits_cents = credits_cents + p_amount_cents,
    low_balance_notified_at = NULL
  WHERE id = v_adv RETURNING credits_cents INTO v_balance;

  INSERT INTO public.advertiser_notifications (advertiser_id, title, body)
  VALUES (v_adv, 'Credits added', 'Your account was topped up by $' || to_char(p_amount_cents / 100.0, 'FM999999990.00') || '.');

  RETURN v_balance;
END $$;

CREATE OR REPLACE FUNCTION public.get_advertiser_billing_statement(p_start timestamptz, p_end timestamptz)
RETURNS TABLE(campaign_id uuid, campaign_name text, impressions bigint, clicks bigint, spend_cents bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name,
    COUNT(e.id) FILTER (WHERE e.event_type = 'impression'),
    COUNT(e.id) FILTER (WHERE e.event_type = 'click'),
    COALESCE(SUM(e.revenue_cents), 0)
  FROM public.ad_campaigns c
  JOIN public.advertisers a ON a.id = c.advertiser_id
  LEFT JOIN public.ad_events e ON e.campaign_id = c.id
    AND e.created_at >= p_start AND e.created_at <= p_end
  WHERE a.user_id = auth.uid()
  GROUP BY c.id, c.name
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_advertiser_ledger(p_start timestamptz, p_end timestamptz)
RETURNS TABLE(created_at timestamptz, kind text, amount_cents integer, reference text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.created_at, t.kind, t.amount_cents, t.reference
  FROM public.advertiser_credit_transactions t
  JOIN public.advertisers a ON a.id = t.advertiser_id
  WHERE a.user_id = auth.uid()
    AND t.created_at >= p_start AND t.created_at <= p_end
  ORDER BY t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.serve_ad(p_video_id uuid, p_category text DEFAULT NULL::text, p_ad_type text DEFAULT 'pre_roll'::text)
 RETURNS TABLE(campaign_id uuid, headline text, creative_url text, click_url text, skip_after_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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

  PERFORM public.notify_low_balance(c.advertiser_id);

  RETURN QUERY SELECT c.id, c.headline, c.creative_url, c.click_url, c.skip_after_seconds;
END $$;