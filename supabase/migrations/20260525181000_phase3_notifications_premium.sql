-- Phase 3 foundations: notifications + premium subscriptions

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_user_id uuid,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark own notifications" ON public.notifications;
CREATE POLICY "Users can mark own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_creator_on_subscribe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.creator_id = NEW.subscriber_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_user_id,
    notification_type,
    title,
    body,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    NEW.creator_id,
    NEW.subscriber_id,
    'new_subscriber',
    'New subscriber',
    'Someone subscribed to your channel.',
    'subscription',
    NEW.id,
    jsonb_build_object('subscriber_id', NEW.subscriber_id, 'creator_id', NEW.creator_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_notify_creator ON public.subscriptions;
CREATE TRIGGER on_subscription_notify_creator
AFTER INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.notify_creator_on_subscribe();

CREATE OR REPLACE FUNCTION public.notify_subscribers_on_video_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.visibility NOT IN ('public', 'unlisted')
    OR NEW.processing_status <> 'ready'
    OR (NEW.publish_at IS NOT NULL AND NEW.publish_at > now()) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_user_id,
    notification_type,
    title,
    body,
    entity_type,
    entity_id,
    metadata
  )
  SELECT
    s.subscriber_id,
    NEW.user_id,
    'new_video',
    'New video from a creator you follow',
    COALESCE(NEW.title, 'A creator published a new video'),
    'video',
    NEW.id,
    jsonb_build_object('video_id', NEW.id, 'creator_id', NEW.user_id)
  FROM public.subscriptions s
  WHERE s.creator_id = NEW.user_id
    AND s.subscriber_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_video_notify_subscribers ON public.videos;
CREATE TRIGGER on_video_notify_subscribers
AFTER INSERT ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.notify_subscribers_on_video_publish();

CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premium_subscriptions_user_status_idx
  ON public.premium_subscriptions (user_id, status);

ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own premium subscription" ON public.premium_subscriptions;
CREATE POLICY "Users can view own premium subscription"
  ON public.premium_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own premium subscription" ON public.premium_subscriptions;
CREATE POLICY "Users can create own premium subscription"
  ON public.premium_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own premium subscription" ON public.premium_subscriptions;
CREATE POLICY "Users can update own premium subscription"
  ON public.premium_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.activate_premium_subscription(p_plan text DEFAULT 'monthly')
RETURNS TABLE (
  id uuid,
  user_id uuid,
  plan text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_plan text := CASE WHEN p_plan = 'yearly' THEN 'yearly' ELSE 'monthly' END;
  v_period_end timestamptz := CASE
    WHEN p_plan = 'yearly' THEN v_now + interval '1 year'
    ELSE v_now + interval '1 month'
  END;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.premium_subscriptions (
    user_id, plan, status, current_period_start, current_period_end, canceled_at, updated_at
  )
  VALUES (v_user_id, v_plan, 'active', v_now, v_period_end, NULL, v_now)
  ON CONFLICT (user_id)
  DO UPDATE SET
    plan = EXCLUDED.plan,
    status = 'active',
    current_period_start = v_now,
    current_period_end = v_period_end,
    canceled_at = NULL,
    updated_at = v_now;

  RETURN QUERY
  SELECT
    ps.id,
    ps.user_id,
    ps.plan,
    ps.status,
    ps.current_period_start,
    ps.current_period_end,
    ps.canceled_at,
    ps.created_at,
    ps.updated_at
  FROM public.premium_subscriptions ps
  WHERE ps.user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_premium_subscription()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  plan text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.premium_subscriptions
  SET
    status = 'canceled',
    canceled_at = v_now,
    updated_at = v_now
  WHERE user_id = v_user_id;

  RETURN QUERY
  SELECT
    ps.id,
    ps.user_id,
    ps.plan,
    ps.status,
    ps.current_period_start,
    ps.current_period_end,
    ps.canceled_at,
    ps.created_at,
    ps.updated_at
  FROM public.premium_subscriptions ps
  WHERE ps.user_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_premium_subscription()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  plan text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ps.id,
    ps.user_id,
    ps.plan,
    ps.status,
    ps.current_period_start,
    ps.current_period_end,
    ps.canceled_at,
    ps.created_at,
    ps.updated_at
  FROM public.premium_subscriptions ps
  WHERE ps.user_id = auth.uid();
$$;
