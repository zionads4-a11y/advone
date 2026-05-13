ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_unread BOOLEAN DEFAULT true;

-- Update existing leads to false so they don't all show up as unread suddenly
UPDATE public.leads SET is_unread = false;

-- The column already has default true for new leads, which is what we want.
