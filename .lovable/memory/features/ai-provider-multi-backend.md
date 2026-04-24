---
name: AI Provider Multi-Backend
description: Sistema permite alternar entre Lovable AI Gateway (Gemini, gratuito) e OpenAI direta por empresa via tabela company_ai_config. Helper compartilhado em supabase/functions/_shared/aiClient.ts. UI em CompanyAIConfigCard.
type: feature
---
# Migração gradual Lovable AI → OpenAI

## Tabela: `company_ai_config`
Configura provider de IA por empresa. Colunas:
- `provider`: 'lovable' (default) | 'openai'
- `model`: ex. 'google/gemini-2.5-flash' | 'gpt-4o' | 'gpt-5'
- `custom_system_prompt`: instruções extras concatenadas ao prompt principal
- `use_openai_for_testing`: força OpenAI no ambiente de teste mesmo quando provider='lovable'

Se a empresa não tiver registro, o sistema cai no padrão (lovable + gemini-2.5-flash).

## Helper: `supabase/functions/_shared/aiClient.ts`
Funções `chatCompletion()` / `chatText()` / `getCompanyAIConfig()`.
Recebem `companyId` e decidem automaticamente entre `https://ai.gateway.lovable.dev/v1/chat/completions` (LOVABLE_API_KEY) ou `https://api.openai.com/v1/chat/completions` (OPENAI_API_KEY).
Mesmo payload OpenAI-compatible (messages, tools, tool_choice).
Suporta reasoning effort para gpt-5*.

## UI: `src/components/companies/CompanyAIConfigCard.tsx`
Plugado em `CompanySettings.tsx`. Permite:
- Toggle visual entre AdvOne IA / OpenAI
- Seleção de modelo com listas separadas por provider
- Prompt system adicional opcional
- Switch "forçar OpenAI no ambiente de teste"

## Migração das edge functions (gradual)
Funções que ainda usam Lovable AI Gateway diretamente (a migrar conforme demanda):
- `test-bot-chat` (ambiente de teste)
- `zapi-webhook` (cérebro principal Laura)
- `decision-engine` (motor de decisão jurídica)
- `generate-lead-summary` (resumo de leads)
- `process-cadence` (validação IA da resposta)

Para migrar uma função: substituir o `fetch("https://ai.gateway.lovable.dev/...")` por `import { chatCompletion } from "../_shared/aiClient.ts"` + `await chatCompletion({ companyId, messages, tools, fallbackModel })`.

## Secrets necessários
- `LOVABLE_API_KEY` (já existia, auto-provisionado)
- `OPENAI_API_KEY` (adicionado em abr/2026, chave do dono da plataforma)
