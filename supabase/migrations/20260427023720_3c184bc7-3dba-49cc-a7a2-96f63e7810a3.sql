ALTER TABLE public.lead_reminders 
ADD COLUMN end_at TIMESTAMP WITH TIME ZONE;

-- For existing meetings, we can optionally populate end_at with due_at + 1 hour
UPDATE public.lead_reminders 
SET end_at = due_at + interval '1 hour'
WHERE reminder_type = 'meeting' AND end_at IS NULL;
