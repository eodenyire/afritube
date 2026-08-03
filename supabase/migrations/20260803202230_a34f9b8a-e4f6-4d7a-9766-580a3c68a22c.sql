-- Private credentials table for live streams
CREATE TABLE public.live_stream_credentials (
  stream_id uuid PRIMARY KEY REFERENCES public.live_streams(id) ON DELETE CASCADE,
  stream_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_stream_credentials TO authenticated;
GRANT ALL ON public.live_stream_credentials TO service_role;

ALTER TABLE public.live_stream_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only the stream creator can read its credentials"
ON public.live_stream_credentials FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.live_streams s
  WHERE s.id = live_stream_credentials.stream_id AND s.creator_id = auth.uid()
));

CREATE TRIGGER update_live_stream_credentials_updated_at
BEFORE UPDATE ON public.live_stream_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing keys
INSERT INTO public.live_stream_credentials (stream_id, stream_key)
SELECT id, COALESCE(NULLIF(stream_key, ''), encode(gen_random_bytes(24), 'hex'))
FROM public.live_streams
ON CONFLICT (stream_id) DO NOTHING;

-- Drop the public column and its old trigger
DROP TRIGGER IF EXISTS trg_live_streams_set_stream_key ON public.live_streams;
DROP FUNCTION IF EXISTS public.set_stream_key_default();
ALTER TABLE public.live_streams DROP COLUMN IF EXISTS stream_key;

-- Auto-create a credentials row for every new stream
CREATE OR REPLACE FUNCTION public.create_stream_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.live_stream_credentials (stream_id)
  VALUES (NEW.id)
  ON CONFLICT (stream_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_live_streams_create_credentials
AFTER INSERT ON public.live_streams
FOR EACH ROW EXECUTE FUNCTION public.create_stream_credentials();

-- Reveal / rotate now read the private table
CREATE OR REPLACE FUNCTION public.get_stream_key(p_stream_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE k text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.stream_key INTO k
  FROM public.live_stream_credentials c
  JOIN public.live_streams s ON s.id = c.stream_id
  WHERE c.stream_id = p_stream_id AND s.creator_id = auth.uid();
  IF k IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN k;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_stream_key(p_stream_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_key text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.live_streams WHERE id = p_stream_id AND creator_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  new_key := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.live_stream_credentials (stream_id, stream_key)
  VALUES (p_stream_id, new_key)
  ON CONFLICT (stream_id) DO UPDATE SET stream_key = EXCLUDED.stream_key, updated_at = now();
  RETURN new_key;
END;
$$;