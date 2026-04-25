-- Função para verificar se uma empresa tem acesso à IA Jurídica
CREATE OR REPLACE FUNCTION public.company_has_legal_ai_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = _company_id
      AND partnership_type = 'mensalidade_zionads'
  )
$$;

-- Tabela de conversas
CREATE TABLE public.legal_ai_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  document_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_ai_conversations_user ON public.legal_ai_conversations(user_id, updated_at DESC);
CREATE INDEX idx_legal_ai_conversations_company ON public.legal_ai_conversations(company_id);

ALTER TABLE public.legal_ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversations on paid companies"
ON public.legal_ai_conversations FOR SELECT
USING (
  (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  AND public.company_has_legal_ai_access(company_id)
);

CREATE POLICY "Users create conversations on paid companies"
ON public.legal_ai_conversations FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.company_has_legal_ai_access(company_id)
  AND (
    public.user_belongs_to_company(auth.uid(), company_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'member'::app_role)
  )
);

CREATE POLICY "Users update own conversations"
ON public.legal_ai_conversations FOR UPDATE
USING (
  (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  AND public.company_has_legal_ai_access(company_id)
);

CREATE POLICY "Users delete own conversations"
ON public.legal_ai_conversations FOR DELETE
USING (
  (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  AND public.company_has_legal_ai_access(company_id)
);

CREATE TRIGGER trg_legal_ai_conversations_updated_at
BEFORE UPDATE ON public.legal_ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de mensagens
CREATE TABLE public.legal_ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.legal_ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  document_type text,
  is_document boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_ai_messages_conversation ON public.legal_ai_messages(conversation_id, created_at);

ALTER TABLE public.legal_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view messages of accessible conversations"
ON public.legal_ai_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.legal_ai_conversations c
    WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      AND public.company_has_legal_ai_access(c.company_id)
  )
);

CREATE POLICY "Users insert messages on own conversations"
ON public.legal_ai_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.legal_ai_conversations c
    WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      AND public.company_has_legal_ai_access(c.company_id)
  )
);

CREATE POLICY "Users delete messages on own conversations"
ON public.legal_ai_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.legal_ai_conversations c
    WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      AND public.company_has_legal_ai_access(c.company_id)
  )
);