-- Comentando linhas com UUID hardcoded para evitar erros de deploy em novos ambientes
-- Estas linhas foram identificadas como problemáticas por conterem um ID de usuário específico.
/*
DELETE FROM public.lead_reminders WHERE created_by = 'd70f6ee5-1020-453c-9bb9-7257181e6e14';
DELETE FROM public.google_calendar_sync_queue WHERE user_id = 'd70f6ee5-1020-453c-9bb9-7257181e6e14';
*/

-- Garantir que as colunas bot_name e bot_role_description existam na tabela companies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'bot_name') THEN
        ALTER TABLE public.companies ADD COLUMN bot_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'bot_role_description') THEN
        ALTER TABLE public.companies ADD COLUMN bot_role_description TEXT;
    END IF;
END $$;