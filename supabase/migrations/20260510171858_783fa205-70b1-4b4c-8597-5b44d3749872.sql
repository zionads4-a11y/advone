CREATE TABLE public.landing_whatsapp_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT,
  phone TEXT,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_whatsapp_clicks ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante (anônimo) pode registrar o clique
CREATE POLICY "Public can log whatsapp clicks"
ON public.landing_whatsapp_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Apenas admins/members enxergam os dados
CREATE POLICY "Admins can view whatsapp clicks"
ON public.landing_whatsapp_clicks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE INDEX idx_landing_wa_clicks_created_at ON public.landing_whatsapp_clicks (created_at DESC);
CREATE INDEX idx_landing_wa_clicks_page ON public.landing_whatsapp_clicks (page);