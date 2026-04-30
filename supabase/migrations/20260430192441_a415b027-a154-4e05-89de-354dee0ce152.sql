-- =====================================================================
-- FINAL SECURITY HARDENING
-- =====================================================================

-- 1) whatsapp_configs: remover qualquer policy legada não-scoped
DROP POLICY IF EXISTS "Admin and members can view whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admin and members can update whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admin and members can insert whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admin and members can delete whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Members can manage whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Members can view whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admins can view whatsapp configs" ON public.whatsapp_configs;

-- 2) asaas_configs: revogar acesso de gerente (chave de pagamento sensível); apenas admin escopado por empresa
DROP POLICY IF EXISTS "Gerentes can manage asaas configs" ON public.asaas_configs;
DROP POLICY IF EXISTS "Admins can manage asaas configs" ON public.asaas_configs;
CREATE POLICY "asaas admin scoped" ON public.asaas_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 3) landing_ia_leads: remover acesso ALL para members (sem company_id na tabela)
DROP POLICY IF EXISTS "Members manage landing IA leads" ON public.landing_ia_leads;

-- 4) Storage: whatsapp-media SELECT escopado por pasta == company_id
DROP POLICY IF EXISTS "Whatsapp-media: authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Whatsapp-media: company-scoped read" ON storage.objects;
CREATE POLICY "Whatsapp-media: company-scoped read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'whatsapp-media' AND (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.user_belongs_to_company(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
  )
);

-- 5) Realtime: subscribe escopado por company_id presente no topic
DROP POLICY IF EXISTS "Authenticated can subscribe realtime" ON realtime.messages;
CREATE POLICY "Realtime company scoped subscribe"
ON realtime.messages FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.client_companies cc
      WHERE cc.user_id = auth.uid()
        AND realtime.topic() LIKE '%' || cc.company_id::text || '%'
    )
  )
);

-- 6) Revogar EXECUTE público em funções SECURITY DEFINER sensíveis
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) FROM anon;