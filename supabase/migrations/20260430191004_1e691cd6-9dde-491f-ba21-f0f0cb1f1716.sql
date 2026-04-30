-- Endurece RLS em credenciais sensíveis e storage para evitar vazamento cross-tenant.
-- Mantém 'admin' global (super-admin ZionAds), mas restringe 'member' a empresas que ele pertence
-- nas tabelas que armazenam credenciais de API.

-- ============================================================
-- 1. whatsapp_configs (tokens UaZapi)
-- ============================================================
DROP POLICY IF EXISTS "Members can manage whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Members manage whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admins can view whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Members can view whatsapp configs" ON public.whatsapp_configs;

CREATE POLICY "Admins manage whatsapp configs"
  ON public.whatsapp_configs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage whatsapp configs scoped"
  ON public.whatsapp_configs FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'member'::app_role)
    AND public.user_belongs_to_company(auth.uid(), company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'member'::app_role)
    AND public.user_belongs_to_company(auth.uid(), company_id)
  );

-- ============================================================
-- 2. zapsign_configs (tokens ZapSign)
-- ============================================================
DROP POLICY IF EXISTS "Members can manage zapsign configs" ON public.zapsign_configs;
DROP POLICY IF EXISTS "Members manage zapsign configs" ON public.zapsign_configs;

CREATE POLICY "Admins manage zapsign configs"
  ON public.zapsign_configs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage zapsign configs scoped"
  ON public.zapsign_configs FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'member'::app_role)
    AND public.user_belongs_to_company(auth.uid(), company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'member'::app_role)
    AND public.user_belongs_to_company(auth.uid(), company_id)
  );

-- ============================================================
-- 3. Storage: whatsapp-media — restringir SELECT por pasta de empresa
-- ============================================================
DROP POLICY IF EXISTS "Whatsapp-media: authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Whatsapp-media authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media authenticated read" ON storage.objects;

CREATE POLICY "Whatsapp-media: company-scoped read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.user_belongs_to_company(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
    )
  );

-- ============================================================
-- 4. Realtime: restringir subscriptions por empresa
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can subscribe realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can subscribe to realtime" ON realtime.messages;

-- Política nova: só permite subscription se for admin OU se o topic terminar com
-- um company_id ao qual o usuário pertence. Convenção esperada: topics do tipo
-- 'whatsapp_messages:<company_id>' ou 'leads:<company_id>'.
CREATE POLICY "Realtime company-scoped subscribe"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'member'::app_role)
      OR EXISTS (
        SELECT 1
        FROM public.client_companies cc
        WHERE cc.user_id = auth.uid()
          AND (
            realtime.topic() LIKE '%' || cc.company_id::text
            OR realtime.topic() LIKE '%:' || cc.company_id::text || ':%'
          )
      )
    )
  );