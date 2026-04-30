-- =====================================================================
-- BLINDAGEM RLS COMPLETA - escopa policies de 'member' por empresa
-- =====================================================================

-- 1. whatsapp_configs
DROP POLICY IF EXISTS "Admin and members can view whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admin and members can update whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admin and members can insert whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admin and members can delete whatsapp configs" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Members manage whatsapp configs scoped" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Admins manage whatsapp configs" ON public.whatsapp_configs;
CREATE POLICY "wa_configs admin all" ON public.whatsapp_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "wa_configs member scoped" ON public.whatsapp_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 2. zapsign_configs
DROP POLICY IF EXISTS "Members manage zapsign configs" ON public.zapsign_configs;
DROP POLICY IF EXISTS "Members manage zapsign configs scoped" ON public.zapsign_configs;
DROP POLICY IF EXISTS "Admins manage zapsign configs" ON public.zapsign_configs;
CREATE POLICY "zapsign admin all" ON public.zapsign_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "zapsign member scoped" ON public.zapsign_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 3. process_monitoring_charges
DROP POLICY IF EXISTS "Members manage process monitoring charges" ON public.process_monitoring_charges;
CREATE POLICY "pmc member scoped" ON public.process_monitoring_charges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 4. commission_charges
DROP POLICY IF EXISTS "Members manage commission charges" ON public.commission_charges;
CREATE POLICY "cc member scoped" ON public.commission_charges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 5. closed_contracts
DROP POLICY IF EXISTS "Members full access closed contracts" ON public.closed_contracts;
CREATE POLICY "closed member scoped" ON public.closed_contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 6. commission_settings
DROP POLICY IF EXISTS "Members manage commission settings" ON public.commission_settings;
CREATE POLICY "cs member scoped" ON public.commission_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 7. meeting_charges
DROP POLICY IF EXISTS "Members manage meeting charges" ON public.meeting_charges;
CREATE POLICY "mc member scoped" ON public.meeting_charges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 8. ai_followup_audit
DROP POLICY IF EXISTS "Members manage ai followup audit" ON public.ai_followup_audit;
CREATE POLICY "afa member scoped" ON public.ai_followup_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 9. company_ai_config
DROP POLICY IF EXISTS "Members manage ai config" ON public.company_ai_config;
CREATE POLICY "cac member scoped" ON public.company_ai_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 10. agreement_installments
DROP POLICY IF EXISTS "Members manage installments" ON public.agreement_installments;
CREATE POLICY "ainst member scoped" ON public.agreement_installments FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'member'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_agreements ca
      WHERE ca.id = agreement_installments.agreement_id
        AND public.user_belongs_to_company(auth.uid(), ca.company_id)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'member'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_agreements ca
      WHERE ca.id = agreement_installments.agreement_id
        AND public.user_belongs_to_company(auth.uid(), ca.company_id)
    )
  );

-- 11. client_agreements
DROP POLICY IF EXISTS "Members manage agreements" ON public.client_agreements;
CREATE POLICY "ca member scoped" ON public.client_agreements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 12. company_cadence_config
DROP POLICY IF EXISTS "Members manage cadence config" ON public.company_cadence_config;
CREATE POLICY "ccc member scoped" ON public.company_cadence_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 13. company_meeting_reminder_config
DROP POLICY IF EXISTS "Members manage meeting reminder config" ON public.company_meeting_reminder_config;
CREATE POLICY "cmrc member scoped" ON public.company_meeting_reminder_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 14. company_niche_alerts
DROP POLICY IF EXISTS "Members manage niche alerts" ON public.company_niche_alerts;
CREATE POLICY "cna member scoped" ON public.company_niche_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 15. generated_documents
DROP POLICY IF EXISTS "Members manage generated documents" ON public.generated_documents;
CREATE POLICY "gd member scoped" ON public.generated_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 16. document_templates
DROP POLICY IF EXISTS "Members manage document templates" ON public.document_templates;
CREATE POLICY "dt member scoped" ON public.document_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 17. company_offices
DROP POLICY IF EXISTS "Members manage company offices" ON public.company_offices;
CREATE POLICY "co member scoped" ON public.company_offices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));

-- 18. landing_ia_leads
DROP POLICY IF EXISTS "Members manage landing IA leads" ON public.landing_ia_leads;

-- 19. zapi_connect_tokens
DROP POLICY IF EXISTS "Admin and members can view tokens" ON public.zapi_connect_tokens;
CREATE POLICY "zct admin view" ON public.zapi_connect_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "zct member view scoped" ON public.zapi_connect_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id));