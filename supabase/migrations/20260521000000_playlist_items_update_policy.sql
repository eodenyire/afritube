-- Ensure playlist_items UPDATE policy exists so owners can reorder videos
-- (the earlier "Owner manages items" FOR ALL policy already covers this,
-- but this migration is idempotent and makes the intent explicit)

DO $$ BEGIN
  -- Guard: only create if the FOR ALL policy already handles UPDATE.
  -- This migration is intentionally a no-op if the policy is already correct.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'playlist_items'
      AND cmd        IN ('UPDATE', 'ALL')
  ) THEN
    CREATE POLICY "Owner updates playlist_items" ON public.playlist_items
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.playlists p
        WHERE p.id = playlist_id AND p.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.playlists p
        WHERE p.id = playlist_id AND p.user_id = auth.uid()
      ));
  END IF;
END $$;
