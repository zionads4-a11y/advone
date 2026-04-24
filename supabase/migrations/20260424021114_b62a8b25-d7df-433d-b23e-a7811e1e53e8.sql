ALTER TABLE public.company_bot_flows
ADD COLUMN IF NOT EXISTS custom_prompt_block text;

COMMENT ON COLUMN public.company_bot_flows.custom_prompt_block IS 'Quando preenchido, substitui o bloco padrao do codigo (botFlowBlocks.ts) na geracao do prompt. Permite editar o prompt de cada fluxo direto pela UI.';