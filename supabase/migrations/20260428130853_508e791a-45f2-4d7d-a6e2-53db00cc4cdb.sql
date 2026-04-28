-- Add decision_rules column to companies table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'decision_rules') THEN
        ALTER TABLE public.companies ADD COLUMN decision_rules TEXT;
    END IF;
END $$;