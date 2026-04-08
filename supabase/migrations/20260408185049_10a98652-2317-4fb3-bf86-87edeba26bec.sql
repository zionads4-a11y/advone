
-- Company monitoring plans (50 or 100 processes)
CREATE TABLE public.company_monitoring_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'professional' CHECK (plan_type IN ('professional', 'elite')),
  max_processes integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Monitored processes
CREATE TABLE public.monitored_processes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL,
  numero_cnj text NOT NULL,
  client_name text NOT NULL,
  tribunal_sigla text,
  classe text,
  assunto text,
  area text,
  status_predito text,
  polo_ativo text,
  polo_passivo text,
  data_inicio date,
  data_ultima_movimentacao date,
  quantidade_movimentacoes integer DEFAULT 0,
  last_checked_at timestamptz,
  escavador_data jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, numero_cnj)
);

-- Process movements
CREATE TABLE public.process_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitored_process_id uuid NOT NULL REFERENCES public.monitored_processes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  escavador_movement_id bigint,
  movement_date date NOT NULL,
  movement_type text,
  content text NOT NULL,
  source_name text,
  source_sigla text,
  source_grau integer,
  is_new boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(monitored_process_id, escavador_movement_id)
);

-- RLS
ALTER TABLE public.company_monitoring_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_movements ENABLE ROW LEVEL SECURITY;

-- company_monitoring_plans policies
CREATE POLICY "Admins can manage monitoring plans" ON public.company_monitoring_plans FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Gerentes can view their monitoring plan" ON public.company_monitoring_plans FOR SELECT TO authenticated USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

-- monitored_processes policies
CREATE POLICY "Admins can manage monitored processes" ON public.monitored_processes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Gerentes can manage monitored processes" ON public.monitored_processes FOR ALL TO authenticated USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id)) WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Operadores can view monitored processes" ON public.monitored_processes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

-- process_movements policies
CREATE POLICY "Admins can manage process movements" ON public.process_movements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Gerentes can view process movements" ON public.process_movements FOR SELECT TO authenticated USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Operadores can view process movements" ON public.process_movements FOR SELECT TO authenticated USING (has_role(auth.uid(), 'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

-- Triggers
CREATE TRIGGER update_company_monitoring_plans_updated_at BEFORE UPDATE ON public.company_monitoring_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monitored_processes_updated_at BEFORE UPDATE ON public.monitored_processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
