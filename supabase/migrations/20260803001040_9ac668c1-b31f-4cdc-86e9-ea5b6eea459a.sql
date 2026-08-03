DROP POLICY IF EXISTS "sdr_hides_client_leads" ON public.leads;

CREATE POLICY "sdr_hides_client_leads"
ON public.leads
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  get_operator_profile(auth.uid()) IS DISTINCT FROM 'sdr_closer'::operator_profile
  OR COALESCE(is_client, false) = false
  OR assigned_to IS NULL
  OR assigned_to = auth.uid()
);