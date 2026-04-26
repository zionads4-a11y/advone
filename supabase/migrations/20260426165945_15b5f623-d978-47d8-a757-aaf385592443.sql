ALTER TABLE public.lead_reminders
  ADD COLUMN IF NOT EXISTS lawyer_3h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lawyer_30m_sent boolean NOT NULL DEFAULT false;