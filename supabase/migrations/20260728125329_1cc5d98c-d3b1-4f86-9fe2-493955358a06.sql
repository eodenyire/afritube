
CREATE OR REPLACE FUNCTION public.bump_super_chat_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_streams
  SET total_super_chat_cents = total_super_chat_cents + GREATEST(0, (ROUND(NEW.amount_usd * 100))::int)
  WHERE id = NEW.stream_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_super_chat_total ON public.live_super_chats;
CREATE TRIGGER trg_bump_super_chat_total
AFTER INSERT ON public.live_super_chats
FOR EACH ROW
EXECUTE FUNCTION public.bump_super_chat_total();
