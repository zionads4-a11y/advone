
-- ADVBOX integration: config per company + push queue
CREATE TABLE public.advbox_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  api_token text NOT NULL,
  base_url text NOT NULL DEFAULT 'https://app.advbox.com.br/api/v1',
  enabled boolean NOT NULL DEFAULT true,
  auto_push_on_won boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advbox_configs TO authenticated;
GRANT ALL ON public.advbox_configs TO service_role;

ALTER TABLE public.advbox_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and members full access on advbox_configs"
  ON public.advbox_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member'));

CREATE POLICY "Company gerente can view own advbox config"
  ON public.advbox_configs FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company gerente can update own advbox config"
  ON public.advbox_configs FOR UPDATE TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'gerente'))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Company gerente can insert own advbox config"
  ON public.advbox_configs FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'gerente'));

CREATE TRIGGER update_advbox_configs_updated_at
  BEFORE UPDATE ON public.advbox_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Push log
CREATE TABLE public.advbox_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  advbox_id text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advbox_push_log TO authenticated;
GRANT ALL ON public.advbox_push_log TO service_role;

ALTER TABLE public.advbox_push_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/members read all advbox_push_log"
  ON public.advbox_push_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member'));

CREATE POLICY "Company users read own advbox_push_log"
  ON public.advbox_push_log FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE INDEX idx_advbox_push_log_lead ON public.advbox_push_log(lead_id);
CREATE INDEX idx_advbox_push_log_company ON public.advbox_push_log(company_id, created_at DESC);
