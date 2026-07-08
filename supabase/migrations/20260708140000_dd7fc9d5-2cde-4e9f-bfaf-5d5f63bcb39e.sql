ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS lawyer_title text NOT NULL DEFAULT 'Dra.'
  CHECK (lawyer_title IN ('Dra.', 'Dr.'));