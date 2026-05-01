
-- =========================
-- 1) whatsapp_configs: limpar TODAS as políticas e recriar com escopo
-- =========================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='whatsapp_configs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.whatsapp_configs', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "wa_configs admin all" ON public.whatsapp_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "wa_configs member scoped" ON public.whatsapp_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "wa_configs gerente scoped" ON public.whatsapp_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- =========================
-- 2) asaas_configs: somente admin lê (api_key é segredo)
-- =========================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='asaas_configs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.asaas_configs', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "asaas_configs admin only" ON public.asaas_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- =========================
-- 3) realtime.messages: somente admin OU tópico contém company_id do usuário
-- =========================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='realtime' AND tablename='messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Realtime admin all" ON realtime.messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Realtime company scoped" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_companies cc
      WHERE cc.user_id = auth.uid()
        AND realtime.topic() LIKE '%' || cc.company_id::text || '%'
    )
  );

-- =========================
-- 4) Storage: whatsapp-media escopo por pasta company_id
-- =========================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname ILIKE '%whatsapp-media%' OR policyname ILIKE '%Whatsapp-media%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "whatsapp-media company scoped read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'whatsapp-media' AND (
      public.has_role(auth.uid(),'admin'::app_role)
      OR public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "whatsapp-media company scoped write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-media' AND (
      public.has_role(auth.uid(),'admin'::app_role)
      OR public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "whatsapp-media company scoped delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'whatsapp-media' AND (
      public.has_role(auth.uid(),'admin'::app_role)
      OR public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

-- =========================
-- 5) landing_ia_leads: admin only
-- =========================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='landing_ia_leads'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.landing_ia_leads', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "landing_ia_leads admin only" ON public.landing_ia_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Permitir INSERT público (formulário da landing)
CREATE POLICY "landing_ia_leads public insert" ON public.landing_ia_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- =========================
-- 6) commission_charges: escopo por company
-- =========================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='commission_charges'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.commission_charges', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "commission_charges admin all" ON public.commission_charges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "commission_charges member scoped" ON public.commission_charges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "commission_charges gerente scoped" ON public.commission_charges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));
