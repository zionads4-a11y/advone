
-- ============================================================
-- Isolamento por empresa para kanban_columns
-- Gerente e Operador veem apenas colunas das suas empresas
-- ============================================================

-- Remover políticas antigas que agrupam gerente/operador em "member"
DROP POLICY IF EXISTS "Admin and members can view all kanban columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Admin and members can insert kanban columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Admin and members can update kanban columns" ON public.kanban_columns;
DROP POLICY IF EXISTS "Admin and members can delete kanban columns" ON public.kanban_columns;

-- SELECT: admin vê tudo, demais veem apenas das suas empresas
CREATE POLICY "Admins can view all kanban columns"
ON public.kanban_columns FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view kanban columns of their companies"
ON public.kanban_columns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = kanban_columns.company_id
  )
);

-- INSERT: admin e usuários vinculados à empresa
CREATE POLICY "Admins can insert kanban columns"
ON public.kanban_columns FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert kanban columns for their companies"
ON public.kanban_columns FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = kanban_columns.company_id
  )
);

-- UPDATE: admin e usuários vinculados
CREATE POLICY "Admins can update kanban columns"
ON public.kanban_columns FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update kanban columns of their companies"
ON public.kanban_columns FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = kanban_columns.company_id
  )
);

-- DELETE: apenas admin
CREATE POLICY "Admins can delete kanban columns"
ON public.kanban_columns FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Isolamento por empresa para whatsapp_messages
-- Gerente e Operador veem apenas mensagens das suas empresas
-- ============================================================

DROP POLICY IF EXISTS "Admin and members can view whatsapp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Service can insert whatsapp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Clients can view whatsapp messages of their companies" ON public.whatsapp_messages;

-- SELECT: admin vê tudo
CREATE POLICY "Admins can view all whatsapp messages"
ON public.whatsapp_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- SELECT: todos os outros veem apenas mensagens das suas empresas
CREATE POLICY "Users can view whatsapp messages of their companies"
ON public.whatsapp_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = whatsapp_messages.company_id
  )
);

-- INSERT: admin e usuários vinculados (para envio de mensagens)
CREATE POLICY "Admins can insert whatsapp messages"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert whatsapp messages for their companies"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = whatsapp_messages.company_id
  )
);
