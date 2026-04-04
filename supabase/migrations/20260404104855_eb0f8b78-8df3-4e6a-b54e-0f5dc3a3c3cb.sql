
ALTER TABLE public.lead_reminders
  ADD COLUMN recurrence_rule text DEFAULT NULL,
  ADD COLUMN recurrence_end timestamp with time zone DEFAULT NULL,
  ADD COLUMN parent_event_id uuid DEFAULT NULL REFERENCES public.lead_reminders(id) ON DELETE SET NULL;
