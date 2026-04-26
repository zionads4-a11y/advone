-- Cadence config: 5 tentativas por empresa
CREATE TABLE public.company_cadence_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  step_number integer NOT NULL CHECK (step_number BETWEEN 1 AND 5),
  delay_minutes integer NOT NULL CHECK (delay_minutes >= 0),
  message_text text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, step_number)
);

ALTER TABLE public.company_cadence_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cadence config"
  ON public.company_cadence_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage cadence config"
  ON public.company_cadence_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their cadence config"
  ON public.company_cadence_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company members view cadence config"
  ON public.company_cadence_config FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_company_cadence_config_updated_at
  BEFORE UPDATE ON public.company_cadence_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meeting reminder config: janelas de aviso pré-reunião
CREATE TABLE public.company_meeting_reminder_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  window_key text NOT NULL CHECK (window_key IN ('reminder_6h', 'reminder_2h', 'reminder_30m')),
  minutes_before integer NOT NULL CHECK (minutes_before > 0),
  message_text text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, window_key)
);

ALTER TABLE public.company_meeting_reminder_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meeting reminder config"
  ON public.company_meeting_reminder_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage meeting reminder config"
  ON public.company_meeting_reminder_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their meeting reminder config"
  ON public.company_meeting_reminder_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company members view meeting reminder config"
  ON public.company_meeting_reminder_config FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_company_meeting_reminder_config_updated_at
  BEFORE UPDATE ON public.company_meeting_reminder_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();