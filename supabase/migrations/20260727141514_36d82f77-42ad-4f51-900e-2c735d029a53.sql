UPDATE public.whatsapp_configs
   SET zapi_instance_id = NULL,
       zapi_token = NULL,
       zapi_webhook_configured = false,
       status = 'disconnected',
       ai_enabled = false,
       ai_auto_reply = false
 WHERE company_id = 'dff917b9-ae18-4ebc-8ea1-069b7ac96342';