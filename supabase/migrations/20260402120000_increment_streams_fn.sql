create or replace function increment_streams(track_id uuid)
returns void
language sql
security definer
as $$
  update audio_tracks
  set streams = streams + 1
  where id = track_id;
$$;
