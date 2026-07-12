-- YouTube-style phased foundation schema (Waves A-D)

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS is_short boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS videos_short_discovery_idx
  ON public.videos (is_short, created_at DESC)
  WHERE is_short = true;

CREATE TABLE IF NOT EXISTS public.video_seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL UNIQUE REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  thumbnail_title text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  end_screen_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  card_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  ctr_target numeric(5,2),
  retention_target numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_seo_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own seo settings" ON public.video_seo_settings;
CREATE POLICY "Users can view own seo settings"
  ON public.video_seo_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role('admin', auth.uid()));

DROP POLICY IF EXISTS "Users can create own seo settings" ON public.video_seo_settings;
CREATE POLICY "Users can create own seo settings"
  ON public.video_seo_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role('admin', auth.uid()));

DROP POLICY IF EXISTS "Users can update own seo settings" ON public.video_seo_settings;
CREATE POLICY "Users can update own seo settings"
  ON public.video_seo_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role('admin', auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.has_role('admin', auth.uid()));

CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'canceled')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  replay_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_streams_visibility_status_idx
  ON public.live_streams (visibility, status, scheduled_for DESC);

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view available live streams" ON public.live_streams;
CREATE POLICY "Users can view available live streams"
  ON public.live_streams FOR SELECT TO authenticated
  USING (visibility = 'public' OR auth.uid() = creator_id OR public.has_role('admin', auth.uid()));

DROP POLICY IF EXISTS "Creators can manage own live streams" ON public.live_streams;
CREATE POLICY "Creators can manage own live streams"
  ON public.live_streams FOR ALL TO authenticated
  USING (auth.uid() = creator_id OR public.has_role('admin', auth.uid()))
  WITH CHECK (auth.uid() = creator_id OR public.has_role('admin', auth.uid()));

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_super_chat boolean NOT NULL DEFAULT false,
  amount_usd numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_chat_messages_stream_created_idx
  ON public.live_chat_messages (stream_id, created_at DESC);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view chat for accessible streams" ON public.live_chat_messages;
CREATE POLICY "Users can view chat for accessible streams"
  ON public.live_chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.live_streams ls
      WHERE ls.id = live_chat_messages.stream_id
        AND (ls.visibility = 'public' OR ls.creator_id = auth.uid() OR public.has_role('admin', auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.live_chat_messages;
CREATE POLICY "Users can insert own chat messages"
  ON public.live_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.live_streams ls
      WHERE ls.id = live_chat_messages.stream_id
        AND ls.status IN ('scheduled', 'live')
        AND (ls.visibility = 'public' OR ls.creator_id = auth.uid() OR public.has_role('admin', auth.uid()))
    )
  );

CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('video', 'comment', 'stream', 'profile')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'rejected')),
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_reports_status_created_idx
  ON public.moderation_reports (status, created_at DESC);

ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create moderation reports" ON public.moderation_reports;
CREATE POLICY "Users can create moderation reports"
  ON public.moderation_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own moderation reports" ON public.moderation_reports;
CREATE POLICY "Users can view own moderation reports"
  ON public.moderation_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role('admin', auth.uid()) OR public.has_role('moderator', auth.uid()));

DROP POLICY IF EXISTS "Moderators can update moderation reports" ON public.moderation_reports;
CREATE POLICY "Moderators can update moderation reports"
  ON public.moderation_reports FOR UPDATE TO authenticated
  USING (public.has_role('admin', auth.uid()) OR public.has_role('moderator', auth.uid()))
  WITH CHECK (public.has_role('admin', auth.uid()) OR public.has_role('moderator', auth.uid()));

CREATE TABLE IF NOT EXISTS public.copyright_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimant_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reason text NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  reviewer_id uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copyright_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own copyright claims" ON public.copyright_claims;
CREATE POLICY "Users can create own copyright claims"
  ON public.copyright_claims FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = claimant_id);

DROP POLICY IF EXISTS "Users can view own copyright claims" ON public.copyright_claims;
CREATE POLICY "Users can view own copyright claims"
  ON public.copyright_claims FOR SELECT TO authenticated
  USING (auth.uid() = claimant_id OR public.has_role('admin', auth.uid()) OR public.has_role('moderator', auth.uid()));

DROP POLICY IF EXISTS "Moderators can update copyright claims" ON public.copyright_claims;
CREATE POLICY "Moderators can update copyright claims"
  ON public.copyright_claims FOR UPDATE TO authenticated
  USING (public.has_role('admin', auth.uid()) OR public.has_role('moderator', auth.uid()))
  WITH CHECK (public.has_role('admin', auth.uid()) OR public.has_role('moderator', auth.uid()));

CREATE TABLE IF NOT EXISTS public.channel_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  member_id uuid NOT NULL,
  tier_name text NOT NULL DEFAULT 'supporter',
  monthly_price_usd numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, member_id)
);

ALTER TABLE public.channel_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view relevant memberships" ON public.channel_memberships;
CREATE POLICY "Users can view relevant memberships"
  ON public.channel_memberships FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = member_id OR public.has_role('admin', auth.uid()));

DROP POLICY IF EXISTS "Users can create own memberships" ON public.channel_memberships;
CREATE POLICY "Users can create own memberships"
  ON public.channel_memberships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id OR public.has_role('admin', auth.uid()));

DROP POLICY IF EXISTS "Users can update relevant memberships" ON public.channel_memberships;
CREATE POLICY "Users can update relevant memberships"
  ON public.channel_memberships FOR UPDATE TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = creator_id OR public.has_role('admin', auth.uid()))
  WITH CHECK (auth.uid() = member_id OR auth.uid() = creator_id OR public.has_role('admin', auth.uid()));

CREATE TABLE IF NOT EXISTS public.live_super_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  amount_usd numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_super_chats_stream_created_idx
  ON public.live_super_chats (stream_id, created_at DESC);

ALTER TABLE public.live_super_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view relevant super chats" ON public.live_super_chats;
CREATE POLICY "Users can view relevant super chats"
  ON public.live_super_chats FOR SELECT TO authenticated
  USING (auth.uid() = viewer_id OR auth.uid() = creator_id OR public.has_role('admin', auth.uid()));

DROP POLICY IF EXISTS "Users can create own super chats" ON public.live_super_chats;
CREATE POLICY "Users can create own super chats"
  ON public.live_super_chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = viewer_id);
