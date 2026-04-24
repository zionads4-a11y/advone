-- ============================================================
-- 1) Tabela: google_calendar_connections
-- ============================================================
CREATE TABLE public.google_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connected_by uuid NOT NULL,
  google_email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scope text NOT NULL,
  selected_calendar_id text,
  selected_calendar_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Members of the company OR admins can view
CREATE POLICY "Company members and admins view gcal connection"
ON public.google_calendar_connections
FOR SELECT
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Company members and admins insert gcal connection"
ON public.google_calendar_connections
FOR INSERT
WITH CHECK (
  public.user_belongs_to_company(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Company members and admins update gcal connection"
ON public.google_calendar_connections
FOR UPDATE
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Company members and admins delete gcal connection"
ON public.google_calendar_connections
FOR DELETE
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER trg_gcal_connections_updated_at
BEFORE UPDATE ON public.google_calendar_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) Tabela: google_calendar_sync_state
-- ============================================================
CREATE TABLE public.google_calendar_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  calendar_id text NOT NULL,
  sync_token text,
  channel_id text,
  resource_id text,
  channel_expiration timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, calendar_id)
);

ALTER TABLE public.google_calendar_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members and admins view gcal sync state"
ON public.google_calendar_sync_state
FOR SELECT
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER trg_gcal_sync_state_updated_at
BEFORE UPDATE ON public.google_calendar_sync_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) Tabela: google_calendar_event_links (mapeamento de eventos)
-- ============================================================
CREATE TABLE public.google_calendar_event_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reminder_id uuid REFERENCES public.lead_reminders(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  google_calendar_id text NOT NULL,
  etag text,
  source text NOT NULL DEFAULT 'advone', -- 'advone' or 'google'
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, google_event_id),
  UNIQUE (reminder_id)
);

CREATE INDEX idx_gcal_event_links_company ON public.google_calendar_event_links(company_id);
CREATE INDEX idx_gcal_event_links_reminder ON public.google_calendar_event_links(reminder_id);

ALTER TABLE public.google_calendar_event_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members and admins view gcal event links"
ON public.google_calendar_event_links
FOR SELECT
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================================
-- 4) Trigger: dispara push ao Google Calendar em criar/editar/excluir reminder
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_google_calendar_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fn_url text;
  has_connection boolean;
  affected_company uuid;
  op text;
  reminder_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_company := OLD.company_id;
    reminder_id := OLD.id;
    op := 'delete';
  ELSE
    affected_company := NEW.company_id;
    reminder_id := NEW.id;
    op := lower(TG_OP); -- 'insert' or 'update'
  END IF;

  -- Only proceed if company has an active Google connection
  SELECT EXISTS (
    SELECT 1 FROM public.google_calendar_connections
    WHERE company_id = affected_company AND is_active = true
  ) INTO has_connection;

  IF NOT has_connection THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  fn_url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/google-calendar-push';

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'reminder_id', reminder_id,
      'company_id', affected_company,
      'operation', op
    )
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_lead_reminders_gcal_push
AFTER INSERT OR UPDATE OR DELETE ON public.lead_reminders
FOR EACH ROW EXECUTE FUNCTION public.trigger_google_calendar_push();