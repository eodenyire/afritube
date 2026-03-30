
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, creator_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can see subscriptions (for counts)
CREATE POLICY "Subscriptions are viewable by everyone"
  ON public.subscriptions FOR SELECT
  USING (true);

-- Authenticated users can subscribe
CREATE POLICY "Users can subscribe"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = subscriber_id);

-- Users can unsubscribe
CREATE POLICY "Users can unsubscribe"
  ON public.subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = subscriber_id);

-- Function to update subscriber_count on profiles when subscriptions change
CREATE OR REPLACE FUNCTION public.update_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET subscriber_count = (
      SELECT COUNT(*) FROM public.subscriptions WHERE creator_id = NEW.creator_id
    )
    WHERE user_id = NEW.creator_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET subscriber_count = (
      SELECT COUNT(*) FROM public.subscriptions WHERE creator_id = OLD.creator_id
    )
    WHERE user_id = OLD.creator_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to auto-update counts
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR DELETE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriber_count();
