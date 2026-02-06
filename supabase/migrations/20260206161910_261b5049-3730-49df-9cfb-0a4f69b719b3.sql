
-- Add assigned_to column to leads table
ALTER TABLE public.leads ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Create lead_reminders table
CREATE TABLE public.lead_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  reminder_type text NOT NULL DEFAULT 'reminder', -- 'reminder' or 'meeting'
  due_at timestamp with time zone NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create lead_summaries table
CREATE TABLE public.lead_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  generated_by_ai boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_reminders
CREATE POLICY "Admin and members can manage reminders"
ON public.lead_reminders FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Clients can view reminders of their companies"
ON public.lead_reminders FOR SELECT
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Clients can insert reminders for their companies"
ON public.lead_reminders FOR INSERT
TO authenticated
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Clients can update reminders of their companies"
ON public.lead_reminders FOR UPDATE
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Clients can delete reminders of their companies"
ON public.lead_reminders FOR DELETE
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

-- RLS policies for lead_summaries
CREATE POLICY "Admin and members can manage summaries"
ON public.lead_summaries FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Clients can view summaries of their companies"
ON public.lead_summaries FOR SELECT
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Clients can insert summaries for their companies"
ON public.lead_summaries FOR INSERT
TO authenticated
WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Clients can update summaries of their companies"
ON public.lead_summaries FOR UPDATE
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

-- Triggers for updated_at
CREATE TRIGGER update_lead_reminders_updated_at
BEFORE UPDATE ON public.lead_reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_summaries_updated_at
BEFORE UPDATE ON public.lead_summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for reminders (for notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_reminders;
