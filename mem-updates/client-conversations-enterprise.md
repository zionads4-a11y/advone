---
name: Client Conversations (Enterprise)
description: Sistema Enterprise de atendimento a clientes ativos, separado do funil de leads
type: feature
---

# Conversas de Clientes (Plano Enterprise)

## Tabelas
- `client_conversations` — 1 conversa por cliente/assunto ativo. Campos: `company_id`, `client_lead_id` (FK leads), `legal_area_id`, `assigned_lawyer_id`, `subject`, `status` (active/archived), `source` (whatsapp/manual/system), `last_message_at`, `unread_count`.
- `client_conversation_messages` — mensagens (append-only via trigger `block_client_msg_mutation`). Sem UPDATE, sem DELETE, nem admin apaga.
- `client_conversation_transfers` — audit log de transferências (append-only). Trigger `apply_client_conversation_transfer` atualiza área/advogado automaticamente.

## RLS
- Função `user_can_see_client_conversation(user, conv)`:
  - Admin/member: tudo
  - Gerente: tudo da empresa
  - Advogado responsável (`assigned_lawyer_id`): sim
  - Advogado/estagiário: `user_has_area_access(area)`
- Sem policy de DELETE em nenhuma tabela.

## UI
- Rota `/conversas-clientes`, item "Conversas de Clientes" no sidebar (ícone Headphones, marcado `premium: true`).
- Tabs por área jurídica (Trabalhista, Previdenciário, etc.) + "Todas".
- Lista com busca por nome/CPF/telefone, unread badges.
- Painel com histórico, envio de mensagem, transferência (área/advogado + motivo), download `.txt` da conversa, arquivar (nunca deletar).
- Realtime via `postgres_changes` na tabela de mensagens.

## Landing Page
Card "AdvOne Enterprise" (4º card, sem preço, "Sob consulta"), CTA "Falar com nossa equipe" abrindo WhatsApp `5511999999999` (TROCAR pelo número real).

## Pendências (próxima fase)
- Gate de plano: só liberar menu/rota quando `companies.billing_model = 'enterprise'`.
- Edge function `laura-client-router` com tools `identify_client`, `get_process_status`, `request_lawyer`, `route_to_sector`.
- Integrar `zapi-webhook` para: quando `shared_whatsapp = true`, checar se número é cliente, criar `client_conversations` em vez de `leads`.
- Enviar mensagem `sendReply` via `send-whatsapp` edge function (hoje só registra no banco).
- Export em PDF (hoje só .txt).
