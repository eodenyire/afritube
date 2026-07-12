DO $$
BEGIN
  CREATE TYPE public.payout_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ad_slot text NOT NULL DEFAULT 'watch_preroll',
  revenue_usd numeric(12, 4) NOT NULL DEFAULT 0.0000 CHECK (revenue_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_impressions_creator_created_idx
  ON public.ad_impressions (creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ad_impressions_video_created_idx
  ON public.ad_impressions (video_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd numeric(12, 2) NOT NULL CHECK (amount_usd > 0),
  status public.payout_status NOT NULL DEFAULT 'pending',
  payout_method text,
  payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_requests_creator_created_idx
  ON public.payout_requests (creator_id, created_at DESC);

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators view own ad impressions" ON public.ad_impressions;
CREATE POLICY "Creators view own ad impressions"
ON public.ad_impressions
FOR SELECT
TO authenticated
USING (
  auth.uid() = creator_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Creators view own payout requests" ON public.payout_requests;
CREATE POLICY "Creators view own payout requests"
ON public.payout_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = creator_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Creators insert own payout requests" ON public.payout_requests;
CREATE POLICY "Creators insert own payout requests"
ON public.payout_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = creator_id
  AND status = 'pending'
);

DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON public.payout_requests;
CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_ad_impression(
  p_video_id uuid,
  p_creator_id uuid,
  p_viewer_id uuid DEFAULT NULL,
  p_ad_slot text DEFAULT 'watch_preroll',
  p_revenue_usd numeric DEFAULT 0.0040
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_visibility public.video_visibility;
  v_publish_at timestamptz;
  v_creator_monetized boolean := false;
  normalized_revenue numeric(12, 4);
BEGIN
  SELECT user_id, visibility, publish_at
  INTO v_owner, v_visibility, v_publish_at
  FROM public.videos
  WHERE id = p_video_id;

  IF v_owner IS NULL OR v_owner <> p_creator_id THEN
    RETURN false;
  END IF;

  IF v_visibility NOT IN ('public', 'unlisted') THEN
    RETURN false;
  END IF;

  IF v_publish_at IS NOT NULL AND v_publish_at > now() THEN
    RETURN false;
  END IF;

  SELECT is_monetized INTO v_creator_monetized
  FROM public.profiles
  WHERE user_id = p_creator_id;

  IF NOT COALESCE(v_creator_monetized, false) THEN
    RETURN false;
  END IF;

  normalized_revenue := LEAST(GREATEST(COALESCE(p_revenue_usd, 0), 0), 5)::numeric(12, 4);

  INSERT INTO public.ad_impressions (video_id, creator_id, viewer_id, ad_slot, revenue_usd)
  VALUES (p_video_id, p_creator_id, p_viewer_id, COALESCE(NULLIF(trim(p_ad_slot), ''), 'watch_preroll'), normalized_revenue);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_earnings_summary(
  p_creator_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  total_revenue_usd numeric,
  this_month_revenue_usd numeric,
  impressions bigint,
  this_month_impressions bigint,
  pending_payout_usd numeric,
  paid_payout_usd numeric,
  rpm_usd numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH authorized AS (
    SELECT 1
    WHERE auth.uid() = p_creator_id
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
  ),
  ai_agg AS (
    SELECT
      COALESCE(SUM(ai.revenue_usd), 0)::numeric(12, 4) AS total_revenue_usd,
      COALESCE(SUM(ai.revenue_usd) FILTER (WHERE ai.created_at >= date_trunc('month', now())), 0)::numeric(12, 4) AS this_month_revenue_usd,
      COALESCE(COUNT(ai.id), 0)::bigint AS impressions,
      COALESCE(COUNT(ai.id) FILTER (WHERE ai.created_at >= date_trunc('month', now())), 0)::bigint AS this_month_impressions
    FROM public.ad_impressions ai
    WHERE ai.creator_id = p_creator_id
  ),
  pr_agg AS (
    SELECT
      COALESCE(SUM(pr.amount_usd) FILTER (WHERE pr.status IN ('pending', 'approved')), 0)::numeric(12, 2) AS pending_payout_usd,
      COALESCE(SUM(pr.amount_usd) FILTER (WHERE pr.status = 'paid'), 0)::numeric(12, 2) AS paid_payout_usd
    FROM public.payout_requests pr
    WHERE pr.creator_id = p_creator_id
  )
  SELECT
    ai_agg.total_revenue_usd,
    ai_agg.this_month_revenue_usd,
    ai_agg.impressions,
    ai_agg.this_month_impressions,
    pr_agg.pending_payout_usd,
    pr_agg.paid_payout_usd,
    CASE
      WHEN ai_agg.impressions > 0 THEN ROUND((ai_agg.total_revenue_usd / ai_agg.impressions) * 1000, 4)
      ELSE 0::numeric
    END::numeric(12, 4) AS rpm_usd
  FROM authorized, ai_agg, pr_agg;
$$;

CREATE OR REPLACE FUNCTION public.request_payout(
  p_amount_usd numeric,
  p_payout_method text DEFAULT NULL,
  p_payout_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  total_revenue numeric(12, 4);
  reserved_or_paid numeric(12, 2);
  available numeric(12, 2);
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Invalid payout amount';
  END IF;

  SELECT COALESCE(SUM(revenue_usd), 0)::numeric(12, 4)
  INTO total_revenue
  FROM public.ad_impressions
  WHERE creator_id = uid;

  SELECT COALESCE(SUM(amount_usd), 0)::numeric(12, 2)
  INTO reserved_or_paid
  FROM public.payout_requests
  WHERE creator_id = uid
    AND status IN ('pending', 'approved', 'paid');

  available := GREATEST(total_revenue::numeric(12, 2) - reserved_or_paid, 0);

  IF p_amount_usd::numeric(12, 2) > available THEN
    RAISE EXCEPTION 'Insufficient available balance. Available: % USD', available;
  END IF;

  INSERT INTO public.payout_requests (
    creator_id,
    amount_usd,
    status,
    payout_method,
    payout_details
  )
  VALUES (
    uid,
    p_amount_usd::numeric(12, 2),
    'pending',
    NULLIF(trim(COALESCE(p_payout_method, '')), ''),
    COALESCE(p_payout_details, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
