
-- Add AI configuration fields to whatsapp_configs
ALTER TABLE public.whatsapp_configs 
  ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ai_prompt TEXT DEFAULT 'Você é um atendente virtual da empresa. Seja cordial, responda dúvidas dos clientes de forma clara e objetiva. Se não souber a resposta, diga que vai encaminhar para um atendente humano.',
  ADD COLUMN ai_auto_reply BOOLEAN NOT NULL DEFAULT false;

-- Allow insert on whatsapp_messages via service role (for outgoing messages stored by edge functions)
-- The existing policy only allows admin/member insert, we need to keep that
-- but also allow the edge function to insert outgoing messages
