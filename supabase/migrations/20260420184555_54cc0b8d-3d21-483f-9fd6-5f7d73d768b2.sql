UPDATE public.whatsapp_configs 
SET triage_options = NULL 
WHERE company_id = (SELECT id FROM public.companies WHERE name ILIKE '%gisele%' LIMIT 1);