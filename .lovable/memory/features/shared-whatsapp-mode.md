---
name: Shared WhatsApp Mode (leads + clientes no mesmo número)
description: Flag por empresa (`companies.shared_whatsapp_number` + `client_support_responsible_phone`) que adiciona ramo no prompt do bot: pergunta "já é cliente?", busca processo por CPF via tool `lookup_existing_client` e alerta advogado responsável. Bot é desativado para o lead após acionar a tool (handoff humano).
type: feature
---

**Tabela companies — colunas novas:**
- `shared_whatsapp_number boolean default false`
- `client_support_responsible_phone text` (fallback: `companies.whatsapp`)

**UI:** toggle + input no `CompanyFormDialog` e `CompanyEditDialog`.

**Prompt:** `buildDynamicLauraPrompt({ ..., sharedWhatsapp })` injeta bloco "ATENDIMENTO COMPARTILHADO" com prioridade absoluta. Substitui a Mensagem 2 da abertura por "Você já é cliente do escritório?" e ramifica:
- CASO A (cliente): pede nome completo + CPF → chama tool `lookup_existing_client` → responde com resumo do processo OU "advogado já foi avisado". Sem `decide_lead`, sem agendamento.
- CASO B (não-cliente): segue fluxo normal (fluxos específicos, qualificação, agendamento).

Exceção explícita à regra "🚫 nunca peça CPF" — só vale para Caso A.

**Tool nova `lookup_existing_client` (SDR tools no `zapi-webhook`):**
- Args: `client_full_name`, `cpf`, `subject` (`andamento_processo` | `outro`), `message_summary`.
- Busca `leads` por `company_id` + `cpf_cliente_final` + `is_client=true`. Pega último `lead_summaries.summary_text`.
- Sempre dispara WhatsApp para `client_support_responsible_phone || companies.whatsapp` via UaZapi (mesma instância da empresa).
- Define `leads.bot_disabled=true` após acionar (handoff humano).
- Retorna `{ found_in_system, processo_numero, last_summary, notified_lawyer }`.

**BotFlowsEditor:** já lê `shared_whatsapp_number` da empresa e passa para `buildDynamicLauraPrompt`. Após mudar a flag, gerente precisa clicar "Gerar prompt com os fluxos selecionados" para reescrever `whatsapp_configs.ai_prompt`.
