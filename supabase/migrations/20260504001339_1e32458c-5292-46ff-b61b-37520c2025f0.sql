
-- Tabela de snapshots de consultas INSS/Escavador por CPF
CREATE TABLE public.lead_cpf_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  cpf text NOT NULL,
  source text NOT NULL DEFAULT 'escavador',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processes_count integer NOT NULL DEFAULT 0,
  signature text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_cpf_lookups_lead ON public.lead_cpf_lookups(lead_id, created_at DESC);
CREATE INDEX idx_lead_cpf_lookups_company ON public.lead_cpf_lookups(company_id);
CREATE INDEX idx_lead_cpf_lookups_cpf ON public.lead_cpf_lookups(cpf);

ALTER TABLE public.lead_cpf_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all cpf lookups" ON public.lead_cpf_lookups
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "company users view cpf lookups" ON public.lead_cpf_lookups
  FOR SELECT TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "gerente manage cpf lookups" ON public.lead_cpf_lookups
  FOR ALL TO authenticated 
  USING (has_role(auth.uid(),'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(),'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "operador view cpf lookups" ON public.lead_cpf_lookups
  FOR SELECT TO authenticated 
  USING (has_role(auth.uid(),'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

-- Alertas quando muda algo na consulta
CREATE TABLE public.lead_cpf_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  cpf text NOT NULL,
  alert_type text NOT NULL,
  title text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  notified_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_cpf_alerts_lead ON public.lead_cpf_alerts(lead_id, created_at DESC);
CREATE INDEX idx_lead_cpf_alerts_company ON public.lead_cpf_alerts(company_id, read_at);

ALTER TABLE public.lead_cpf_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all cpf alerts" ON public.lead_cpf_alerts
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "company users view cpf alerts" ON public.lead_cpf_alerts
  FOR SELECT TO authenticated USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "gerente manage cpf alerts" ON public.lead_cpf_alerts
  FOR ALL TO authenticated 
  USING (has_role(auth.uid(),'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(),'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "operador update cpf alerts" ON public.lead_cpf_alerts
  FOR UPDATE TO authenticated 
  USING (has_role(auth.uid(),'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

-- Trigger: enfileira consulta quando CPF do cliente final é definido em um lead
CREATE OR REPLACE FUNCTION public.trigger_cpf_auto_lookup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text;
BEGIN
  IF NEW.cpf_cliente_final IS NOT NULL
     AND length(regexp_replace(NEW.cpf_cliente_final,'\D','','g')) = 11
     AND (OLD.cpf_cliente_final IS NULL OR OLD.cpf_cliente_final IS DISTINCT FROM NEW.cpf_cliente_final) THEN
    fn_url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/cpf-lookup-runner';
    PERFORM net.http_post(
      url := fn_url,
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('lead_id', NEW.id, 'company_id', NEW.company_id, 'cpf', NEW.cpf_cliente_final, 'reason','auto_on_cpf_set')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_auto_cpf_lookup ON public.leads;
CREATE TRIGGER leads_auto_cpf_lookup
AFTER INSERT OR UPDATE OF cpf_cliente_final ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.trigger_cpf_auto_lookup();
