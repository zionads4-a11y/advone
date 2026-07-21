ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_lawyer_title_check;
ALTER TABLE public.companies ALTER COLUMN lawyer_title SET DEFAULT 'Dr.(a)';
ALTER TABLE public.companies ADD CONSTRAINT companies_lawyer_title_check CHECK (lawyer_title IN ('Dra.', 'Dr.', 'Dr.(a)'));