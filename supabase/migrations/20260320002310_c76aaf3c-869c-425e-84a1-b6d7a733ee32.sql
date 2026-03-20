
-- Add personalization fields to whatsapp_configs
ALTER TABLE public.whatsapp_configs 
  ADD COLUMN IF NOT EXISTS office_name text,
  ADD COLUMN IF NOT EXISTS practice_area text,
  ADD COLUMN IF NOT EXISTS communication_tone text DEFAULT 'moderado',
  ADD COLUMN IF NOT EXISTS scheduling_link text,
  ADD COLUMN IF NOT EXISTS consultation_duration text DEFAULT '30 minutos',
  ADD COLUMN IF NOT EXISTS target_audience text;

-- Add lead_score to leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS lead_score text DEFAULT 'morno';

-- Create cadence_messages table for automated follow-ups
CREATE TABLE public.cadence_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone text NOT NULL,
  day_number integer NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  message_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cadence_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for cadence_messages
CREATE POLICY "Admins can manage cadence messages"
  ON public.cadence_messages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view cadence messages of their companies"
  ON public.cadence_messages FOR SELECT
  TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

-- Index for efficient cron queries
CREATE INDEX idx_cadence_pending ON public.cadence_messages (status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_cadence_lead ON public.cadence_messages (lead_id);
