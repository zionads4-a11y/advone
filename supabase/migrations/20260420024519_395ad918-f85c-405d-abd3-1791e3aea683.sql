-- Trigger: notifica empresa via WhatsApp quando uma reunião (meeting) é criada
CREATE OR REPLACE FUNCTION public.notify_meeting_scheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fn_url text;
  service_key text;
BEGIN
  IF NEW.reminder_type <> 'meeting' THEN
    RETURN NEW;
  END IF;

  fn_url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/notify-meeting-scheduled';

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('reminder_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_meeting_scheduled ON public.lead_reminders;
CREATE TRIGGER trg_notify_meeting_scheduled
AFTER INSERT ON public.lead_reminders
FOR EACH ROW
EXECUTE FUNCTION public.notify_meeting_scheduled();