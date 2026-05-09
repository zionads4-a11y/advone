CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company_phone 
  ON public.whatsapp_messages(company_id, phone, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_leads_company_created 
  ON public.leads(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_created 
  ON public.subscriptions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user_company 
  ON public.user_module_permissions(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_legal_ai_conversations_company 
  ON public.legal_ai_conversations(company_id, updated_at DESC);
