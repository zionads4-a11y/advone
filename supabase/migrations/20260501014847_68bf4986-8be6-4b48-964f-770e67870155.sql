-- Operador pode ver o plano de monitoramento da própria empresa
CREATE POLICY "Operadores can view their monitoring plan"
ON public.company_monitoring_plans
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'operador'::app_role)
  AND user_belongs_to_company(auth.uid(), company_id)
);

-- Member também (caso alguma empresa use o papel member como interno)
CREATE POLICY "Members can view monitoring plan"
ON public.company_monitoring_plans
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'member'::app_role)
  AND user_belongs_to_company(auth.uid(), company_id)
);