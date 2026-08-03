-- 1. Stream keys must never be readable through the API
REVOKE SELECT (stream_key) ON public.live_streams FROM anon, authenticated;

-- 2. Watch history privacy
DROP POLICY IF EXISTS "Watch history is viewable by everyone" ON public.watch_history;
CREATE POLICY "Viewer or creator can read watch history"
ON public.watch_history FOR SELECT TO authenticated
USING (auth.uid() = viewer_id OR auth.uid() = creator_id);

-- 3. Subscription relationship privacy
DROP POLICY IF EXISTS "Subscriptions are viewable by everyone" ON public.subscriptions;
CREATE POLICY "Subscriber or creator can read subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);