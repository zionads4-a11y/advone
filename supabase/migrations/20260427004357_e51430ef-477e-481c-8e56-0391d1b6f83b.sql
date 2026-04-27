-- Add google_event_id column to lead_reminders
ALTER TABLE public.lead_reminders ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_lead_reminders_google_event_id ON public.lead_reminders(google_event_id);
