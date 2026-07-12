DO $$
BEGIN
  CREATE TYPE public.recommendation_event_type AS ENUM (
    'search_query',
    'search_result_click',
    'watch_start',
    'watch_complete'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NULL REFERENCES public.videos(id) ON DELETE SET NULL,
  event_type public.recommendation_event_type NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recommendation_events_user_created_idx
  ON public.recommendation_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recommendation_events_event_created_idx
  ON public.recommendation_events (event_type, created_at DESC);

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert recommendation events" ON public.recommendation_events;
CREATE POLICY "Users can insert recommendation events"
  ON public.recommendation_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own recommendation events" ON public.recommendation_events;
CREATE POLICY "Users can view own recommendation events"
  ON public.recommendation_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
