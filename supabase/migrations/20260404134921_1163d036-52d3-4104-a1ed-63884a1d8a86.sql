CREATE POLICY "Gerentes can update their own company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'gerente'::app_role)
  AND user_belongs_to_company(auth.uid(), id)
);