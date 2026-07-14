DROP POLICY IF EXISTS "Anyone authenticated can view global rules" ON public.decision_rules;
CREATE POLICY "Internal staff can view global rules"
ON public.decision_rules
FOR SELECT
TO authenticated
USING (
  company_id IS NULL
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'member'::app_role)
    OR public.has_role(auth.uid(), 'gerente'::app_role)
    OR public.has_role(auth.uid(), 'operador'::app_role)
  )
);