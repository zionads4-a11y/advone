
ALTER TABLE public.whatsapp_configs
ADD COLUMN IF NOT EXISTS ai_objective text DEFAULT 'Entrar em contato com os Leads e agendar uma reunião',
ADD COLUMN IF NOT EXISTS alert_whatsapp text;
