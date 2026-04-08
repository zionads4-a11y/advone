
ALTER TABLE public.lead_reminders ADD COLUMN IF NOT EXISTS reminder_6h_sent boolean NOT NULL DEFAULT false;
ALTER TABLE public.lead_reminders ADD COLUMN IF NOT EXISTS reminder_2h_sent boolean NOT NULL DEFAULT false;
ALTER TABLE public.lead_reminders ADD COLUMN IF NOT EXISTS reminder_30m_sent boolean NOT NULL DEFAULT false;
