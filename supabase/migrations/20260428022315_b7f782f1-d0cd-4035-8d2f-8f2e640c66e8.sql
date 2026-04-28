ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS bot_name TEXT DEFAULT 'Laura',
ADD COLUMN IF NOT EXISTS bot_role_description TEXT DEFAULT 'atendente virtual';