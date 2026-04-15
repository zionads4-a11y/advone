
-- Create enum for bot agent types
CREATE TYPE public.bot_agent_type AS ENUM ('document_collector', 'viability_analyzer', 'contract_closer');

-- Create enum for document request status
CREATE TYPE public.document_request_status AS ENUM ('requested', 'received', 'approved', 'rejected');

-- Table: company_bot_agents - per-company agent configuration
CREATE TABLE public.company_bot_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_type public.bot_agent_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  prompt TEXT,
  required_documents JSONB DEFAULT '[]'::jsonb,
  contract_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, agent_type)
);

ALTER TABLE public.company_bot_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bot agents" ON public.company_bot_agents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Gerentes can manage their company bot agents" ON public.company_bot_agents FOR ALL TO authenticated USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id)) WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Members can manage bot agents" ON public.company_bot_agents FOR ALL TO authenticated USING (has_role(auth.uid(), 'member'::app_role));

-- Table: lead_document_requests - track document requests per lead
CREATE TABLE public.lead_document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  status public.document_request_status NOT NULL DEFAULT 'requested',
  file_url TEXT,
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  received_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document requests" ON public.lead_document_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Gerentes can manage their company document requests" ON public.lead_document_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id)) WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Company users can view document requests" ON public.lead_document_requests FOR SELECT TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));

-- Add bot_agent_phase to leads table to track which agent is handling the lead
ALTER TABLE public.leads ADD COLUMN bot_agent_phase TEXT DEFAULT 'sdr';

-- Add viability_result to leads for storing AI analysis
ALTER TABLE public.leads ADD COLUMN viability_result JSONB;

-- Add contract_status to leads
ALTER TABLE public.leads ADD COLUMN contract_status TEXT DEFAULT NULL;

-- Triggers for updated_at
CREATE TRIGGER update_company_bot_agents_updated_at BEFORE UPDATE ON public.company_bot_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_document_requests_updated_at BEFORE UPDATE ON public.lead_document_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
