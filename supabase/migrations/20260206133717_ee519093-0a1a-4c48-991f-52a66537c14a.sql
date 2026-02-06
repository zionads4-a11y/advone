
-- Allow clients to update lead status in their companies
CREATE POLICY "Clients can update leads of their companies"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_companies
      WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = leads.company_id
    )
  );
