
CREATE TABLE public.video_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

ALTER TABLE public.video_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone"
  ON public.video_reactions FOR SELECT TO public USING (true);

CREATE POLICY "Users can add reactions"
  ON public.video_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON public.video_reactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.video_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_video_reactions_video ON public.video_reactions(video_id);
CREATE INDEX idx_video_reactions_user ON public.video_reactions(user_id);
