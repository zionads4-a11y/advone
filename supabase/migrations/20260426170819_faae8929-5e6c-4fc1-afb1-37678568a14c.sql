CREATE TABLE IF NOT EXISTS public.landing_ia_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  oab text,
  practice_area text,
  preferred_date date,
  preferred_time text,
  message text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_ia_leads_created_at
  ON public.landing_ia_leads (created_at DESC);

ALTER TABLE public.landing_ia_leads ENABLE ROW LEVEL SECURITY;

-- Visitantes anônimos OU autenticados podem se cadastrar via formulário público.
CREATE POLICY "Anyone can submit landing IA lead"
  ON public.landing_ia_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Apenas admins/members veem e gerenciam.
CREATE POLICY "Admins manage landing IA leads"
  ON public.landing_ia_leads
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage landing IA leads"
  ON public.landing_ia_leads
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE TRIGGER trg_landing_ia_leads_updated
  BEFORE UPDATE ON public.landing_ia_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();