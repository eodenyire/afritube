
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS replay_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_super_chat boolean NOT NULL DEFAULT false,
  amount_usd numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_chat_messages_stream_idx ON public.live_chat_messages(stream_id, created_at DESC);
GRANT SELECT ON public.live_chat_messages TO anon;
GRANT SELECT, INSERT ON public.live_chat_messages TO authenticated;
GRANT ALL ON public.live_chat_messages TO service_role;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat viewable on public streams" ON public.live_chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND (s.visibility = 'public' OR s.creator_id = auth.uid())));
CREATE POLICY "Signed-in users post their own chat" ON public.live_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.live_super_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd numeric(10,2) NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_super_chats_stream_idx ON public.live_super_chats(stream_id, created_at DESC);
GRANT SELECT, INSERT ON public.live_super_chats TO authenticated;
GRANT ALL ON public.live_super_chats TO service_role;
ALTER TABLE public.live_super_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender or creator can read super chats" ON public.live_super_chats FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.creator_id = auth.uid()));
CREATE POLICY "Signed-in users send super chats" ON public.live_super_chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
