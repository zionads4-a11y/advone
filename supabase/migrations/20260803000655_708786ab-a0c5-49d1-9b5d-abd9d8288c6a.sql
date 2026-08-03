DROP POLICY IF EXISTS "sdr_hides_client_leads" ON public.leads;

CREATE POLICY "sdr_hides_client_leads"
ON public.leads
AS RESTRICTIVE
FOR SELECT
USING (
  NOT (
    get_operator_profile(auth.uid()) = 'sdr_closer'::operator_profile
    AND COALESCE(is_client, false) = true
    AND assigned_to IS DISTINCT FROM auth.uid()
  )
);