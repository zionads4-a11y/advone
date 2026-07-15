
-- 1) Table lead_internal_messages (chat interno SDR ↔ advogado)
CREATE TABLE public.lead_internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_internal_messages_lead ON public.lead_internal_messages(lead_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_internal_messages TO authenticated;
GRANT ALL ON public.lead_internal_messages TO service_role;

ALTER TABLE public.lead_internal_messages ENABLE ROW LEVEL SECURITY;

-- Helper: reusa mesma lógica dos leads via user_belongs_to_company + assigned_to
CREATE OR REPLACE FUNCTION public.user_can_see_lead(_user_id UUID, _lead_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company UUID; v_assigned UUID;
BEGIN
  SELECT company_id, assigned_to INTO v_company, v_assigned
    FROM public.leads WHERE id = _lead_id;
  IF v_company IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id,'admin'::app_role)
     OR public.has_role(_user_id,'member'::app_role) THEN RETURN true; END IF;
  IF NOT public.user_belongs_to_company(_user_id, v_company) THEN RETURN false; END IF;
  IF public.has_role(_user_id,'gerente'::app_role) THEN RETURN true; END IF;
  IF v_assigned = _user_id THEN RETURN true; END IF;
  RETURN false;
END;
$$;

CREATE POLICY "read lead internal messages"
  ON public.lead_internal_messages FOR SELECT TO authenticated
  USING (public.user_can_see_lead(auth.uid(), lead_id));

CREATE POLICY "insert lead internal messages"
  ON public.lead_internal_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.user_can_see_lead(auth.uid(), lead_id));

CREATE POLICY "delete own lead internal messages"
  ON public.lead_internal_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_internal_messages;

-- 2) Trigger notify lawyer on assignment
CREATE OR REPLACE FUNCTION public.notify_lawyer_on_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  fn_url TEXT;
BEGIN
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;
  fn_url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/notify-lawyer-assigned';
  BEGIN
    PERFORM net.http_post(
      url := fn_url,
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('lead_id', NEW.id, 'user_id', NEW.assigned_to, 'company_id', NEW.company_id)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_lawyer_on_assignment
  AFTER INSERT OR UPDATE OF assigned_to ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_lawyer_on_assignment();

-- 3) Trigger notify on internal message mention
CREATE OR REPLACE FUNCTION public.notify_user_on_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  fn_url TEXT; uid UUID;
BEGIN
  IF NEW.mentions IS NULL OR array_length(NEW.mentions,1) IS NULL THEN RETURN NEW; END IF;
  fn_url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/notify-lawyer-assigned';
  FOREACH uid IN ARRAY NEW.mentions LOOP
    BEGIN
      PERFORM net.http_post(
        url := fn_url,
        headers := jsonb_build_object('Content-Type','application/json'),
        body := jsonb_build_object(
          'lead_id', NEW.lead_id,
          'user_id', uid,
          'company_id', NEW.company_id,
          'kind', 'mention',
          'message', NEW.content
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_user_on_mention
  AFTER INSERT ON public.lead_internal_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_mention();
