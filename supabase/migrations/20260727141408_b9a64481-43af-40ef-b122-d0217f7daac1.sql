UPDATE public.whatsapp_configs
   SET ai_enabled = true, ai_auto_reply = true, ai_disabled = false
 WHERE company_id = 'dff917b9-ae18-4ebc-8ea1-069b7ac96342';

UPDATE public.companies
   SET billing_model = 'plan_completo'
 WHERE id = 'dff917b9-ae18-4ebc-8ea1-069b7ac96342';