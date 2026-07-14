
-- Phase 1: streaming infrastructure

-- 1. Extend live_streams
ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS stream_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS ingest_url text,
  ADD COLUMN IF NOT EXISTS playback_url text,
  ADD COLUMN IF NOT EXISTS latency_mode text NOT NULL DEFAULT 'normal' CHECK (latency_mode IN ('low','normal')),
  ADD COLUMN IF NOT EXISTS record_replay boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS peak_viewer_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_super_chat_cents integer NOT NULL DEFAULT 0;

-- Backfill any existing rows with a random stream key
UPDATE public.live_streams
SET stream_key = encode(gen_random_bytes(24), 'hex')
WHERE stream_key IS NULL;

-- Auto-assign stream_key on insert if not provided
CREATE OR REPLACE FUNCTION public.set_stream_key_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stream_key IS NULL OR NEW.stream_key = '' THEN
    NEW.stream_key := encode(gen_random_bytes(24), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_streams_set_stream_key ON public.live_streams;
CREATE TRIGGER trg_live_streams_set_stream_key
BEFORE INSERT ON public.live_streams
FOR EACH ROW EXECUTE FUNCTION public.set_stream_key_default();

-- RPC: creator rotates their own stream key
CREATE OR REPLACE FUNCTION public.rotate_stream_key(p_stream_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.live_streams WHERE id = p_stream_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  new_key := encode(gen_random_bytes(24), 'hex');
  UPDATE public.live_streams SET stream_key = new_key, updated_at = now() WHERE id = p_stream_id;
  RETURN new_key;
END;
$$;

-- Hide stream_key from non-owners via a view + policy strategy:
-- Instead of a view, we rely on the client only requesting stream_key for own streams.
-- Add an explicit policy that blocks selecting stream_key indirectly by adding a helper
-- function creators call to read their own key safely.
CREATE OR REPLACE FUNCTION public.get_stream_key(p_stream_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT stream_key INTO k FROM public.live_streams
  WHERE id = p_stream_id AND creator_id = auth.uid();
  IF k IS NULL THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN k;
END;
$$;

-- 2. stream_reactions (floating emoji)
CREATE TABLE IF NOT EXISTS public.stream_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  emoji text NOT NULL CHECK (char_length(emoji) <= 8),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stream_reactions_stream_created
  ON public.stream_reactions (stream_id, created_at DESC);

GRANT SELECT ON public.stream_reactions TO anon;
GRANT SELECT, INSERT ON public.stream_reactions TO authenticated;
GRANT ALL ON public.stream_reactions TO service_role;

ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reactions on public streams" ON public.stream_reactions;
CREATE POLICY "Anyone can view reactions on public streams"
ON public.stream_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.live_streams s
    WHERE s.id = stream_reactions.stream_id
      AND s.visibility = 'public'
  )
);

DROP POLICY IF EXISTS "Signed-in users can react" ON public.stream_reactions;
CREATE POLICY "Signed-in users can react"
ON public.stream_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_streams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stream_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_reactions;
  END IF;
END $$;

ALTER TABLE public.live_streams REPLICA IDENTITY FULL;
ALTER TABLE public.live_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.stream_reactions REPLICA IDENTITY FULL;
