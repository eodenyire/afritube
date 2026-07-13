CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','canceled')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  thumbnail_url text,
  stream_url text,
  viewer_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_streams_status_idx ON public.live_streams(status);
CREATE INDEX IF NOT EXISTS live_streams_scheduled_for_idx ON public.live_streams(scheduled_for);
CREATE INDEX IF NOT EXISTS live_streams_creator_idx ON public.live_streams(creator_id);
GRANT SELECT ON public.live_streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public streams viewable by everyone" ON public.live_streams FOR SELECT USING (visibility = 'public' OR auth.uid() = creator_id);
CREATE POLICY "Creators insert own streams" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update own streams" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators delete own streams" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid() = creator_id);