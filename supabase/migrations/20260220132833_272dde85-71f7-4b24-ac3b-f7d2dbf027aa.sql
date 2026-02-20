
-- Remove as políticas atuais que permitem "members" ver TODOS os leads
DROP POLICY IF EXISTS "Admin and members can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Admin and members can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admin and members can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admin can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Clients can view leads of their companies" ON public.leads;
DROP POLICY IF EXISTS "Clients can update leads of their companies" ON public.leads;

-- Nova política: apenas admins veem todos os leads
CREATE POLICY "Admins can view all leads"
ON public.leads FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Todos os outros usuários (member, gerente, operador, client) só veem leads das suas empresas
CREATE POLICY "Users can view leads of their companies"
ON public.leads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = leads.company_id
  )
);

-- INSERT: admins podem criar em qualquer empresa; outros só nas suas
CREATE POLICY "Admins can insert leads"
ON public.leads FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert leads for their companies"
ON public.leads FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = leads.company_id
  )
);

-- UPDATE: admins podem atualizar qualquer lead; outros só os das suas empresas
CREATE POLICY "Admins can update leads"
ON public.leads FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update leads of their companies"
ON public.leads FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = leads.company_id
  )
);

-- DELETE: apenas admins
CREATE POLICY "Admins can delete leads"
ON public.leads FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
