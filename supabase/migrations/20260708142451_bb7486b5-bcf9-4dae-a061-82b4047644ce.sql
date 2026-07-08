
-- 1) Restringe acesso da tabela companies para clientes/operadores (esconde segredos OAuth + PII do advogado)
-- Substitui a policy antiga que permitia SELECT integral para qualquer usuário vinculado via client_companies.
DROP POLICY IF EXISTS "Clients can view their assigned companies" ON public.companies;

CREATE POLICY "Members can view assigned companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    user_belongs_to_company(auth.uid(), id)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'member'::app_role)
      OR has_role(auth.uid(), 'gerente'::app_role)
    )
  );

-- View pública segura para clientes/operadores: apenas campos não sensíveis
CREATE OR REPLACE VIEW public.companies_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  website,
  whatsapp,
  business_hours,
  created_at,
  partnership_type,
  service_mode,
  billing_model,
  office_legal_name,
  office_address,
  lawyer_title,
  lawyer_name,
  shared_whatsapp_number,
  ai_disabled
FROM public.companies
WHERE user_belongs_to_company(auth.uid(), id);

GRANT SELECT ON public.companies_public TO authenticated;

-- 2) Corrige SECURITY DEFINER executável por anon (funções internas)
REVOKE EXECUTE ON FUNCTION public.trigger_cpf_auto_lookup() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_webhook_logs() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_client_by_name(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_client_by_name(uuid, text) TO authenticated, service_role;

-- 3) Fixa search_path mutável em cleanup_webhook_logs
CREATE OR REPLACE FUNCTION public.cleanup_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.google_calendar_webhook_logs
  WHERE created_at < now() - interval '7 days';
END;
$$;

-- 4) Substitui policies "always true" em INSERT público por WITH CHECK com validações mínimas
DROP POLICY IF EXISTS "landing_ia_leads public insert" ON public.landing_ia_leads;
CREATE POLICY "landing_ia_leads public insert"
  ON public.landing_ia_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL AND length(trim(name)) BETWEEN 2 AND 120
    AND whatsapp IS NOT NULL AND length(regexp_replace(whatsapp, '\D', '', 'g')) BETWEEN 10 AND 15
    AND (email IS NULL OR length(email) <= 200)
    AND (message IS NULL OR length(message) <= 2000)
    AND (oab IS NULL OR length(oab) <= 30)
    AND (practice_area IS NULL OR length(practice_area) <= 80)
    AND status IS NULL
    AND notes IS NULL
  );

DROP POLICY IF EXISTS "Public can log whatsapp clicks" ON public.landing_whatsapp_clicks;
CREATE POLICY "Public can log whatsapp clicks"
  ON public.landing_whatsapp_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (page IS NULL OR length(page) <= 500)
    AND (phone IS NULL OR length(phone) <= 30)
    AND (user_agent IS NULL OR length(user_agent) <= 1000)
    AND (referrer IS NULL OR length(referrer) <= 1000)
    AND (utm_source IS NULL OR length(utm_source) <= 200)
    AND (utm_medium IS NULL OR length(utm_medium) <= 200)
    AND (utm_campaign IS NULL OR length(utm_campaign) <= 200)
    AND (utm_content IS NULL OR length(utm_content) <= 200)
    AND (utm_term IS NULL OR length(utm_term) <= 200)
  );
