
-- WhatsApp config per company (Z-API credentials)
CREATE TABLE public.whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  zapi_instance_id TEXT NOT NULL,
  zapi_token TEXT NOT NULL,
  zapi_webhook_configured BOOLEAN NOT NULL DEFAULT false,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;

-- Only admin/members see configs (contains sensitive tokens)
CREATE POLICY "Admin and members can view whatsapp configs"
  ON public.whatsapp_configs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin and members can insert whatsapp configs"
  ON public.whatsapp_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin and members can update whatsapp configs"
  ON public.whatsapp_configs FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin can delete whatsapp configs"
  ON public.whatsapp_configs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_configs_updated_at
  BEFORE UPDATE ON public.whatsapp_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WhatsApp messages / conversations
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message_text TEXT,
  direction TEXT NOT NULL DEFAULT 'incoming',
  sender_name TEXT,
  message_id_external TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_whatsapp_messages_company ON public.whatsapp_messages(company_id);
CREATE INDEX idx_whatsapp_messages_lead ON public.whatsapp_messages(lead_id);
CREATE INDEX idx_whatsapp_messages_phone ON public.whatsapp_messages(phone);

-- Admin and members can view all messages
CREATE POLICY "Admin and members can view whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

-- Clients can view messages of their companies
CREATE POLICY "Clients can view whatsapp messages of their companies"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_companies
      WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = whatsapp_messages.company_id
    )
  );

-- Edge function needs to insert (will use service role)
CREATE POLICY "Service can insert whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );
