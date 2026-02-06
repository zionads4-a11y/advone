
-- Create table for temporary QR code connection tokens
CREATE TABLE public.zapi_connect_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '3 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.zapi_connect_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins and members can manage tokens
CREATE POLICY "Admin and members can insert tokens"
  ON public.zapi_connect_tokens
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Admin and members can view tokens"
  ON public.zapi_connect_tokens
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Admin and members can delete tokens"
  ON public.zapi_connect_tokens
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));
