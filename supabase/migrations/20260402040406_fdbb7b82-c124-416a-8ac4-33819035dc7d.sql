
-- Watch history table to log viewing sessions
CREATE TABLE public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  viewer_id UUID,
  creator_id UUID NOT NULL,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view watch history (needed for analytics)
CREATE POLICY "Watch history is viewable by everyone"
  ON public.watch_history FOR SELECT
  TO public
  USING (true);

-- Authenticated users can insert their own watch records
CREATE POLICY "Authenticated users can log watch time"
  ON public.watch_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

-- Anonymous users can also log watch time (viewer_id will be null)
CREATE POLICY "Anonymous users can log watch time"
  ON public.watch_history FOR INSERT
  TO anon
  WITH CHECK (viewer_id IS NULL);

-- Function to add watch time and update creator profile
CREATE OR REPLACE FUNCTION public.add_watch_time(
  p_video_id UUID,
  p_creator_id UUID,
  p_viewer_id UUID DEFAULT NULL,
  p_seconds INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert watch record
  INSERT INTO public.watch_history (video_id, creator_id, viewer_id, watch_seconds)
  VALUES (p_video_id, p_creator_id, p_viewer_id, p_seconds);

  -- Update creator's total watch hours
  UPDATE public.profiles
  SET watch_hours = watch_hours + (p_seconds::numeric / 3600.0)
  WHERE user_id = p_creator_id;

  -- Check monetization eligibility
  PERFORM public.check_monetization_eligibility(p_creator_id);
END;
$$;
