
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'client');

-- Enum for lead status
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost');

-- Enum for campaign source
CREATE TYPE public.campaign_source AS ENUM ('google', 'meta');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Companies table (clients of the agency)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  whatsapp TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and members can view all companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin and members can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin and members can update companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Client access to their companies
CREATE TABLE public.client_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (user_id, company_id)
);

ALTER TABLE public.client_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their company assignments"
  ON public.client_companies FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage client access"
  ON public.client_companies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add client access to companies
CREATE POLICY "Clients can view their assigned companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_companies
      WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = companies.id
    )
  );

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  source campaign_source NOT NULL,
  campaign_id_external TEXT,
  budget DECIMAL(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and members can view all campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Clients can view campaigns of their companies"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_companies
      WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = campaigns.company_id
    )
  );

CREATE POLICY "Admin and members can insert campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin and members can update campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin can delete campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  value DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  source campaign_source,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and members can view all leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Clients can view leads of their companies"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_companies
      WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = leads.company_id
    )
  );

CREATE POLICY "Admin and members can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin and members can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_leads_company ON public.leads(company_id);
CREATE INDEX idx_leads_campaign ON public.leads(campaign_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_campaigns_company ON public.campaigns(company_id);
CREATE INDEX idx_client_companies_user ON public.client_companies(user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- First user gets admin role, rest get member
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
