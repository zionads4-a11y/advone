-- Adicionar coluna para controle de sincronização se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_integrations' AND column_name = 'last_google_sync') THEN
        ALTER TABLE public.user_integrations ADD COLUMN last_google_sync TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- A trigger já existe da solicitação anterior para sincronização instantânea de saída.
-- Vamos garantir que ela esteja ativa e correta.
-- Nota: A sincronização de entrada (Google -> Sistema) é melhor tratada via polling na Edge Function 
-- ou via Webhook (watch), mas para uma implementação robusta e imediata, 
-- vamos reforçar a Edge Function de sincronização.
