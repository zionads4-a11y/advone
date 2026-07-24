# Pacotes 1 + 2 + 4 — Paridade e superioridade vs concorrente

## Pacote 1 — Áudio + Imagem no WhatsApp

**Áudio (transcrição):** já existe hoje via Whisper (`zapi-webhook` → OpenAI `whisper-1`, PT-BR). ✅ Nada a fazer, só validar que o fluxo está ativo.

**Imagem (visão):** novo. No `zapi-webhook`:
- Detectar `msg.type === "image"` (UaZapi) e Meta Cloud `type: "image"`.
- Baixar mídia (`msg.image.url` / `msg.mediaUrl` / Meta media endpoint).
- Enviar pro Lovable AI Gateway (`google/gemini-2.5-flash`, multimodal `image_url`).
- Prompt curto: "Descreva o documento/imagem. Se for documento jurídico (contracheque, holerite, sentença, contrato, RG, comprovante), extraia os dados relevantes."
- Substituir `messageText` por `🖼️ [imagem recebida]: {descrição}` — mesmo padrão do áudio, segue todo o fluxo normal.
- Limite 20MB, fallbacks pra nunca quebrar.

## Pacote 2 — Resposta contextual sobre processo do cliente (modo compartilhado)

Já existe `lookup_existing_client` no bot. Vou expandir:
- Nova tool `get_client_process_status` disponível quando cliente identificado (CPF + nome).
- Busca `datajud_process_details` / `client_processes` da empresa do cliente.
- Retorna: última movimentação (com explicação em linguagem simples, reusando lógica do `explain-process-search`), status, próxima audiência se houver.
- Bot responde diretamente sem transferir pro humano (a menos que cliente peça).
- Prompt reforça: "Se cliente é existente e pergunta sobre andamento, USE a tool get_client_process_status antes de transferir."

## Pacote 4 — Integração ADVBOX

ADVBOX é sistema jurídico brasileiro com API REST (token por escritório).
- Nova tabela `advbox_configs` (company_id, api_token, base_url, enabled).
- Nova aba em `/company-settings` → "Integrações" → cadastro do token ADVBOX.
- Edge function `advbox-sync`:
  - Sync bidirecional de contatos/processos (cron 30min).
  - Ao ganhar lead no Kanban ("Ganho"), envia pra ADVBOX como cliente/caso.
  - Puxa andamentos de processos ADVBOX pra `client_processes`.
- Toggle no plano Complete/Enterprise (feature flag).

## Detalhes técnicos

- **Áudio+Imagem**: `supabase/functions/zapi-webhook/index.ts` — bloco novo após bloco de áudio existente, mesmo padrão de fallback.
- **Contexto processo**: `supabase/functions/zapi-webhook/index.ts` — nova tool no array de tools do bot + handler no switch de tool_calls.
- **ADVBOX**: migration + `src/pages/CompanySettings.tsx` (nova aba) + `supabase/functions/advbox-sync/index.ts` + `advbox-lead-won` trigger no ganho de lead.

## Ordem de execução

1. Imagem no webhook (mais rápido, alto impacto visual).
2. Tool `get_client_process_status` (aproveita infra existente).
3. ADVBOX (maior, isolado — feito por último).

Confirmando: sigo com os 3 nessa ordem?
