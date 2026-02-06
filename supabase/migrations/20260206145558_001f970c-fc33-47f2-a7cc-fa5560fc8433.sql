
-- Gerente needs to be able to view their company's users in client_companies
CREATE POLICY "Gerentes can view their company users"
ON public.client_companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_companies cc
    WHERE cc.user_id = auth.uid()
    AND cc.company_id = client_companies.company_id
  )
  AND has_role(auth.uid(), 'gerente'::app_role)
);

-- Allow gerentes to view profiles of users in their company
CREATE POLICY "Gerentes can view company user profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_companies cc1
    JOIN client_companies cc2 ON cc1.company_id = cc2.company_id
    WHERE cc1.user_id = auth.uid()
    AND cc2.user_id = profiles.user_id
    AND has_role(auth.uid(), 'gerente'::app_role)
  )
);

-- Allow admins to view all profiles (for the ClientUsers page)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
