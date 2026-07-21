
DROP POLICY IF EXISTS "landing_ia_leads public insert" ON public.landing_ia_leads;
CREATE POLICY "landing_ia_leads public insert" ON public.landing_ia_leads
FOR INSERT TO anon, authenticated
WITH CHECK (
  name IS NOT NULL
  AND length(trim(name)) BETWEEN 2 AND 120
  AND whatsapp IS NOT NULL
  AND length(regexp_replace(whatsapp, '\D', '', 'g')) BETWEEN 10 AND 15
  AND (email IS NULL OR length(email) <= 200)
  AND (message IS NULL OR length(message) <= 2000)
  AND (oab IS NULL OR length(oab) <= 30)
  AND (practice_area IS NULL OR length(practice_area) <= 80)
  AND status = 'new'
  AND notes IS NULL
);
