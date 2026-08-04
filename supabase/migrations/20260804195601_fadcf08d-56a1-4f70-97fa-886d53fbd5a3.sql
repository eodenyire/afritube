
-- ============ MONITORING ============
CREATE TABLE public.stream_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE,
  stream_key_hint text,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stream_events_created ON public.stream_events (created_at DESC);
CREATE INDEX idx_stream_events_status ON public.stream_events (status, created_at DESC);
CREATE INDEX idx_stream_events_stream ON public.stream_events (stream_id, created_at DESC);

GRANT SELECT ON public.stream_events TO authenticated;
GRANT ALL ON public.stream_events TO service_role;
ALTER TABLE public.stream_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all stream events" ON public.stream_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators read own stream events" ON public.stream_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_events.stream_id AND s.creator_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_events;

-- ============ ADVERTISERS ============
CREATE TABLE public.advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL,
  contact_email text NOT NULL,
  website text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.advertisers TO authenticated;
GRANT ALL ON public.advertisers TO service_role;
ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own advertiser row" ON public.advertisers
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create own advertiser" ON public.advertisers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own advertiser" ON public.advertisers
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_advertisers_updated_at BEFORE UPDATE ON public.advertisers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CAMPAIGNS ============
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  ad_type text NOT NULL DEFAULT 'pre_roll',
  headline text,
  creative_url text NOT NULL,
  click_url text,
  budget_cents integer NOT NULL DEFAULT 0,
  spent_cents integer NOT NULL DEFAULT 0,
  cpm_cents integer NOT NULL DEFAULT 500,
  skip_after_seconds integer NOT NULL DEFAULT 5,
  target_categories text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_campaigns_serving ON public.ad_campaigns (status, starts_at, ends_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT SELECT ON public.ad_campaigns TO anon;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active campaigns are viewable" ON public.ad_campaigns
  FOR SELECT USING (status = 'active');
CREATE POLICY "Advertisers manage own campaigns" ON public.ad_campaigns
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = ad_campaigns.advertiser_id AND a.user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.advertisers a WHERE a.id = ad_campaigns.advertiser_id AND a.user_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AD EVENTS ============
CREATE TABLE public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  creator_id uuid,
  viewer_id uuid,
  event_type text NOT NULL DEFAULT 'impression',
  revenue_cents integer NOT NULL DEFAULT 0,
  creator_share_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_events_creator ON public.ad_events (creator_id, created_at DESC);
CREATE INDEX idx_ad_events_campaign ON public.ad_events (campaign_id, created_at DESC);

GRANT SELECT ON public.ad_events TO authenticated;
GRANT ALL ON public.ad_events TO service_role;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators read own ad events" ON public.ad_events
  FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Advertisers read own ad events" ON public.ad_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ad_campaigns c JOIN public.advertisers a ON a.id = c.advertiser_id
            WHERE c.id = ad_events.campaign_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Admins read all ad events" ON public.ad_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ SERVE + RECORD AD ============
CREATE OR REPLACE FUNCTION public.serve_ad(p_video_id uuid, p_category text DEFAULT NULL, p_ad_type text DEFAULT 'pre_roll')
RETURNS TABLE (
  campaign_id uuid, headline text, creative_url text, click_url text, skip_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_creator uuid;
  v_monetized boolean;
  c record;
  v_rev int;
BEGIN
  SELECT v.user_id INTO v_creator FROM public.videos v WHERE v.id = p_video_id;
  IF v_creator IS NULL THEN RETURN; END IF;
  SELECT p.is_monetized INTO v_monetized FROM public.profiles p WHERE p.user_id = v_creator;
  IF NOT COALESCE(v_monetized, false) THEN RETURN; END IF;

  SELECT * INTO c FROM public.ad_campaigns ac
  WHERE ac.status = 'active'
    AND ac.ad_type = p_ad_type
    AND ac.starts_at <= now()
    AND (ac.ends_at IS NULL OR ac.ends_at > now())
    AND ac.spent_cents < ac.budget_cents
    AND (cardinality(ac.target_categories) = 0 OR p_category IS NULL OR p_category = ANY(ac.target_categories))
  ORDER BY ac.cpm_cents DESC, random()
  LIMIT 1;

  IF c.id IS NULL THEN RETURN; END IF;

  v_rev := GREATEST(1, (c.cpm_cents / 1000));
  INSERT INTO public.ad_events (campaign_id, video_id, creator_id, viewer_id, event_type, revenue_cents, creator_share_cents)
  VALUES (c.id, p_video_id, v_creator, auth.uid(), 'impression', v_rev, ROUND(v_rev * 0.55));

  UPDATE public.ad_campaigns SET spent_cents = spent_cents + v_rev,
    status = CASE WHEN spent_cents + v_rev >= budget_cents THEN 'completed' ELSE status END
  WHERE id = c.id;

  RETURN QUERY SELECT c.id, c.headline, c.creative_url, c.click_url, c.skip_after_seconds;
END $$;

CREATE OR REPLACE FUNCTION public.record_ad_event(p_campaign_id uuid, p_video_id uuid, p_event_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_creator uuid;
BEGIN
  SELECT v.user_id INTO v_creator FROM public.videos v WHERE v.id = p_video_id;
  INSERT INTO public.ad_events (campaign_id, video_id, creator_id, viewer_id, event_type, revenue_cents, creator_share_cents)
  VALUES (p_campaign_id, p_video_id, v_creator, auth.uid(), COALESCE(p_event_type, 'click'), 0, 0);
END $$;

CREATE OR REPLACE FUNCTION public.get_creator_ad_earnings()
RETURNS TABLE (impressions bigint, clicks bigint, earnings_cents bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'impression'),
    COUNT(*) FILTER (WHERE event_type = 'click'),
    COALESCE(SUM(creator_share_cents), 0)
  FROM public.ad_events WHERE creator_id = auth.uid();
$$;
