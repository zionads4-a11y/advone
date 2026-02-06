
-- Tracking links: configurable links per company
CREATE TABLE public.tracking_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  whatsapp_number TEXT NOT NULL,
  default_message TEXT DEFAULT 'Olá!',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Tracking clicks: each click on a tracking link
CREATE TABLE public.tracking_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_link_id UUID NOT NULL REFERENCES public.tracking_links(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tracking_code TEXT NOT NULL UNIQUE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_clicks ENABLE ROW LEVEL SECURITY;

-- Tracking links policies
CREATE POLICY "Admin and members can view tracking links"
ON public.tracking_links FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Admin and members can insert tracking links"
ON public.tracking_links FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Admin and members can update tracking links"
ON public.tracking_links FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Admin can delete tracking links"
ON public.tracking_links FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view tracking links of their companies"
ON public.tracking_links FOR SELECT
USING (EXISTS (SELECT 1 FROM client_companies WHERE client_companies.user_id = auth.uid() AND client_companies.company_id = tracking_links.company_id));

-- Tracking clicks policies
CREATE POLICY "Admin and members can view tracking clicks"
ON public.tracking_clicks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Clients can view tracking clicks of their companies"
ON public.tracking_clicks FOR SELECT
USING (EXISTS (SELECT 1 FROM client_companies WHERE client_companies.user_id = auth.uid() AND client_companies.company_id = tracking_clicks.company_id));

-- Indexes for performance
CREATE INDEX idx_tracking_links_slug ON public.tracking_links(slug);
CREATE INDEX idx_tracking_links_company ON public.tracking_links(company_id);
CREATE INDEX idx_tracking_clicks_code ON public.tracking_clicks(tracking_code);
CREATE INDEX idx_tracking_clicks_link ON public.tracking_clicks(tracking_link_id);
CREATE INDEX idx_tracking_clicks_company ON public.tracking_clicks(company_id);
