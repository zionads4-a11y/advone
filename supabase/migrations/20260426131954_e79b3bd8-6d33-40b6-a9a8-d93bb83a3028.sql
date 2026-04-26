-- Tabela de cobranças por reunião realizada (R$ 97 cada)
CREATE TABLE public.meeting_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  reminder_id uuid REFERENCES public.lead_reminders(id) ON DELETE SET NULL,
  lead_name text NOT NULL,
  meeting_at timestamptz NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid,
  amount numeric NOT NULL DEFAULT 97.00,
  status text NOT NULL DEFAULT 'pending', -- pending | invoiced | paid | canceled
  asaas_payment_id text,
  asaas_invoice_url text,
  invoice_month text, -- 'YYYY-MM' do faturamento consolidado
  invoiced_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_charges_company ON public.meeting_charges(company_id);
CREATE INDEX idx_meeting_charges_status ON public.meeting_charges(status);
CREATE INDEX idx_meeting_charges_invoice_month ON public.meeting_charges(invoice_month);
CREATE UNIQUE INDEX uq_meeting_charges_reminder ON public.meeting_charges(reminder_id) WHERE reminder_id IS NOT NULL;

ALTER TABLE public.meeting_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meeting charges"
  ON public.meeting_charges FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage meeting charges"
  ON public.meeting_charges FOR ALL
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes view their meeting charges"
  ON public.meeting_charges FOR SELECT
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_meeting_charges_updated_at
  BEFORE UPDATE ON public.meeting_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna na lead_reminders para marcar reunião realizada
ALTER TABLE public.lead_reminders
  ADD COLUMN IF NOT EXISTS meeting_held boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meeting_held_at timestamptz;