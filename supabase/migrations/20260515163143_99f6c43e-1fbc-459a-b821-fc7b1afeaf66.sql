CREATE OR REPLACE FUNCTION public.enable_creator_ads()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  subs int;
  hours numeric;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT subscriber_count, watch_hours INTO subs, hours
  FROM public.profiles WHERE user_id = uid;

  IF subs IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF subs < 100 OR hours < 1000 THEN
    RAISE EXCEPTION 'Not eligible: requires 100 subscribers and 1000 watch hours (current: % subs, % hours)', subs, hours;
  END IF;

  UPDATE public.profiles SET is_monetized = true WHERE user_id = uid;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.disable_creator_ads()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles SET is_monetized = false WHERE user_id = auth.uid();
  RETURN true;
END;
$$;