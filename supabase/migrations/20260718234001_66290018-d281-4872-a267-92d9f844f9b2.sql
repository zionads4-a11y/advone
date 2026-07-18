DROP POLICY IF EXISTS "Anyone can submit demo request" ON public.demo_requests;
CREATE POLICY "Public can submit demo request"
ON public.demo_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  full_name IS NOT NULL AND length(trim(full_name)) BETWEEN 2 AND 120
  AND phone IS NOT NULL AND length(regexp_replace(phone,'\D','','g')) BETWEEN 10 AND 15
  AND city IS NOT NULL AND length(trim(city)) BETWEEN 2 AND 120
  AND email IS NOT NULL AND length(email) <= 200 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND status = 'new'
  AND notes IS NULL
);