REVOKE EXECUTE ON FUNCTION public.notify_low_balance(uuid) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_streams(track_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  update audio_tracks set streams = streams + 1 where id = track_id;
$$;