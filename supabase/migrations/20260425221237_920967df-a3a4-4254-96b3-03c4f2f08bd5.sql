-- ========================================
-- 1. PERMISSÕES POR MÓDULO PARA OPERADORES
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, module)
);

CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user
  ON public.user_module_permissions (user_id, company_id);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Admins gerem tudo
CREATE POLICY "Admins manage module permissions"
  ON public.user_module_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Gerente gerencia permissões dos usuários da própria empresa
CREATE POLICY "Gerentes manage permissions of their company"
  ON public.user_module_permissions
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente'::app_role)
    AND public.user_belongs_to_company(auth.uid(), company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente'::app_role)
    AND public.user_belongs_to_company(auth.uid(), company_id)
  );

-- O próprio usuário pode visualizar suas permissões
CREATE POLICY "Users view their own permissions"
  ON public.user_module_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_module_permissions_updated
  BEFORE UPDATE ON public.user_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper para checar permissão (security definer evita recursão e respeita gerentes)
CREATE OR REPLACE FUNCTION public.user_has_module(_user_id UUID, _company_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admins, members e gerentes têm tudo automaticamente
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'member'::app_role)
    OR (
      public.has_role(_user_id, 'gerente'::app_role)
      AND public.user_belongs_to_company(_user_id, _company_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_module_permissions
      WHERE user_id = _user_id
        AND company_id = _company_id
        AND module = _module
        AND granted = true
    )
$$;

-- ========================================
-- 2. WHATSAPP POR NICHO (alertas de reunião)
-- ========================================
CREATE TABLE IF NOT EXISTS public.company_niche_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  lawyer_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, niche)
);

CREATE INDEX IF NOT EXISTS idx_company_niche_alerts_company
  ON public.company_niche_alerts (company_id, is_active);

ALTER TABLE public.company_niche_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage niche alerts"
  ON public.company_niche_alerts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gerentes manage their niche alerts"
  ON public.company_niche_alerts
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente'::app_role)
    AND public.user_belongs_to_company(auth.uid(), company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente'::app_role)
    AND public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Members manage niche alerts"
  ON public.company_niche_alerts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Company members view niche alerts"
  ON public.company_niche_alerts
  FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_company_niche_alerts_updated
  BEFORE UPDATE ON public.company_niche_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();