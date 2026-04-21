-- Tabela para controle granular de quais fluxos do bot estão ativos por empresa
CREATE TABLE public.company_bot_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  niche TEXT NOT NULL, -- 'previdenciario' | 'trabalhista'
  flow_key TEXT NOT NULL, -- 'aposentadoria', 'beneficio_negado', 'rmc_rcc', 'bpc_loas', 'demora_inss', etc.
  label TEXT NOT NULL,
  icon_emoji TEXT NOT NULL DEFAULT '📋',
  position INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  custom_intro TEXT, -- texto opcional pra customizar abertura do fluxo
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, niche, flow_key)
);

CREATE INDEX idx_company_bot_flows_company ON public.company_bot_flows(company_id, niche, position);

ALTER TABLE public.company_bot_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bot flows"
  ON public.company_bot_flows FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage bot flows"
  ON public.company_bot_flows FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their company bot flows"
  ON public.company_bot_flows FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company members view bot flows"
  ON public.company_bot_flows FOR SELECT
  TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_company_bot_flows_updated_at
  BEFORE UPDATE ON public.company_bot_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();