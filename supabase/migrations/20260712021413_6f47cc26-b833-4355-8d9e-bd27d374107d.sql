
-- ============ TABLES ============

CREATE TABLE public.client_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  legal_area_id uuid REFERENCES public.legal_areas(id) ON DELETE SET NULL,
  assigned_lawyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  source text NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','manual','system')),
  whatsapp_thread_key text,
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  unread_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_conv_company ON public.client_conversations(company_id, status, last_message_at DESC);
CREATE INDEX idx_client_conv_area ON public.client_conversations(company_id, legal_area_id);
CREATE INDEX idx_client_conv_lead ON public.client_conversations(client_lead_id);
CREATE INDEX idx_client_conv_lawyer ON public.client_conversations(assigned_lawyer_id);

CREATE TABLE public.client_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.client_conversations(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  sender_type text NOT NULL CHECK (sender_type IN ('client','laura','lawyer','system')),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text,
  media_url text,
  media_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_conv_msg_conv ON public.client_conversation_messages(conversation_id, created_at);

CREATE TABLE public.client_conversation_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.client_conversations(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  from_area_id uuid REFERENCES public.legal_areas(id) ON DELETE SET NULL,
  to_area_id uuid REFERENCES public.legal_areas(id) ON DELETE SET NULL,
  from_lawyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_lawyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transferred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_conv_transfers_conv ON public.client_conversation_transfers(conversation_id, created_at);

-- ============ GRANTS ============

GRANT SELECT, INSERT, UPDATE ON public.client_conversations TO authenticated;
GRANT ALL ON public.client_conversations TO service_role;

GRANT SELECT, INSERT ON public.client_conversation_messages TO authenticated;
GRANT ALL ON public.client_conversation_messages TO service_role;

GRANT SELECT, INSERT ON public.client_conversation_transfers TO authenticated;
GRANT ALL ON public.client_conversation_transfers TO service_role;

-- ============ RLS ============

ALTER TABLE public.client_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_conversation_transfers ENABLE ROW LEVEL SECURITY;

-- Visibility function (reuses operator profile + area access)
CREATE OR REPLACE FUNCTION public.user_can_see_client_conversation(_user_id uuid, _conv_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid; v_area uuid; v_assigned uuid;
  v_profile public.operator_profile;
BEGIN
  SELECT company_id, legal_area_id, assigned_lawyer_id
    INTO v_company, v_area, v_assigned
    FROM public.client_conversations WHERE id = _conv_id;

  IF v_company IS NULL THEN RETURN false; END IF;

  IF public.has_role(_user_id,'admin'::app_role)
     OR public.has_role(_user_id,'member'::app_role) THEN
    RETURN true;
  END IF;

  IF NOT public.user_belongs_to_company(_user_id, v_company) THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id,'gerente'::app_role) THEN
    RETURN true;
  END IF;

  IF v_assigned = _user_id THEN RETURN true; END IF;

  v_profile := public.get_operator_profile(_user_id);
  IF v_profile IN ('advogado_responsavel','estagiario') AND v_area IS NOT NULL THEN
    RETURN public.user_has_area_access(_user_id, v_area);
  END IF;

  RETURN false;
END;
$$;

-- client_conversations policies
CREATE POLICY "view client conversations"
  ON public.client_conversations FOR SELECT TO authenticated
  USING (public.user_can_see_client_conversation(auth.uid(), id));

CREATE POLICY "insert client conversations in company"
  ON public.client_conversations FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
  );

CREATE POLICY "update client conversations (assign/archive)"
  ON public.client_conversations FOR UPDATE TO authenticated
  USING (public.user_can_see_client_conversation(auth.uid(), id))
  WITH CHECK (public.user_can_see_client_conversation(auth.uid(), id));

-- NO DELETE POLICY — conversations cannot be deleted by anyone.

-- messages policies
CREATE POLICY "view client conversation messages"
  ON public.client_conversation_messages FOR SELECT TO authenticated
  USING (public.user_can_see_client_conversation(auth.uid(), conversation_id));

CREATE POLICY "insert client conversation messages"
  ON public.client_conversation_messages FOR INSERT TO authenticated
  WITH CHECK (public.user_can_see_client_conversation(auth.uid(), conversation_id));

-- Append-only: block UPDATE / DELETE via trigger (no policies + explicit guard)
CREATE OR REPLACE FUNCTION public.block_client_msg_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Mensagens de conversas de clientes são somente-leitura (append-only).';
END;
$$;

CREATE TRIGGER client_conv_msg_no_update
  BEFORE UPDATE ON public.client_conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.block_client_msg_mutation();

CREATE TRIGGER client_conv_msg_no_delete
  BEFORE DELETE ON public.client_conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.block_client_msg_mutation();

-- transfers policies
CREATE POLICY "view client conversation transfers"
  ON public.client_conversation_transfers FOR SELECT TO authenticated
  USING (public.user_can_see_client_conversation(auth.uid(), conversation_id));

CREATE POLICY "insert client conversation transfers"
  ON public.client_conversation_transfers FOR INSERT TO authenticated
  WITH CHECK (public.user_can_see_client_conversation(auth.uid(), conversation_id));

CREATE TRIGGER client_conv_transfer_no_update
  BEFORE UPDATE ON public.client_conversation_transfers
  FOR EACH ROW EXECUTE FUNCTION public.block_client_msg_mutation();

CREATE TRIGGER client_conv_transfer_no_delete
  BEFORE DELETE ON public.client_conversation_transfers
  FOR EACH ROW EXECUTE FUNCTION public.block_client_msg_mutation();

-- ============ TRIGGERS ============

CREATE TRIGGER update_client_conversations_updated_at
  BEFORE UPDATE ON public.client_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-bump last_message_* on new message
CREATE OR REPLACE FUNCTION public.bump_client_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.client_conversations
     SET last_message_at = NEW.created_at,
         last_message_preview = left(coalesce(NEW.content,''), 180),
         unread_count = CASE WHEN NEW.direction = 'in' THEN unread_count + 1 ELSE unread_count END,
         updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bump_client_conv_last_msg
  AFTER INSERT ON public.client_conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_client_conversation_last_message();

-- Apply transfer: when a transfer row is inserted, update conversation area/lawyer
CREATE OR REPLACE FUNCTION public.apply_client_conversation_transfer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.client_conversations
     SET legal_area_id = COALESCE(NEW.to_area_id, legal_area_id),
         assigned_lawyer_id = COALESCE(NEW.to_lawyer_id, assigned_lawyer_id),
         updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_client_conv_transfer
  AFTER INSERT ON public.client_conversation_transfers
  FOR EACH ROW EXECUTE FUNCTION public.apply_client_conversation_transfer();
