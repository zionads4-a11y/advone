-- Add unique constraint to google_event_id
ALTER TABLE public.lead_reminders ADD CONSTRAINT lead_reminders_google_event_id_key UNIQUE (google_event_id);
