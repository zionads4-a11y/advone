# Multi-setor + Advogado Responsável — 3 features

## 1. Round-robin por área (Laura distribui leads)

**Tool nova no `zapi-webhook`: `assign_lead_to_area_lawyer`**
- Args: `area_name` (ex "trabalhista"), `reason` (opcional).
- Busca `legal_areas` da empresa por nome (unaccent/ilike).
- Busca advogados via `user_legal_areas` com `operator_profile IN ('advogado_responsavel','gerente')`.
- Escolhe o com **menos leads abertos** no momento (`leads.assigned_to = X AND kanban_column.is_won=false AND is_lost=false`).
- Seta `leads.assigned_to`, `leads.area_direito`, dispara notificação (item 2).
- Laura chama automaticamente quando detecta assunto claro no fluxo de qualificação.

**Prompt Laura:** adiciona instrução "quando identificar a área do caso, chame `assign_lead_to_area_lawyer` em silêncio, sem avisar o lead."

## 2. Notificação WhatsApp pro advogado

**Trigger novo em `leads`:** `notify_lawyer_on_assignment`
- Dispara quando `assigned_to` muda (INSERT ou UPDATE).
- Se novo responsável ≠ null e ≠ anterior, chama edge function `notify-lawyer-assigned` via `net.http_post`.

**Edge function `notify-lawyer-assigned`:**
- Busca telefone do advogado (`profiles.whatsapp` ou `profiles.phone`).
- Envia via `send-whatsapp` usando a instância da empresa:
  ```
  🔔 Novo lead atribuído: {nome}
  Área: {área}
  Telefone: {phone}
  Abra: {app_url}/leads/{lead_id}
  ```
- Log em `audit_logs`.

**Requisito:** adicionar coluna `profiles.whatsapp text` (se não existir) + campo no perfil pro advogado cadastrar.

## 3. Chat interno no card do lead (SDR ↔ advogado)

**Tabela nova `lead_internal_messages`:**
- `id`, `lead_id`, `company_id`, `sender_id` (user), `content text`, `mentions uuid[]` (usuários mencionados com @), `created_at`.
- RLS: quem pode ver o lead pode ver as mensagens (reusa lógica existente — admin/gerente/assigned_to/área).
- Grant padrão + realtime habilitado.

**UI nova em `LeadDetailDrawer.tsx`:**
- Aba "Notas internas 💬" (separada de "Notas" que hoje é `lead_notes`).
- Lista mensagens tipo chat, avatar + nome + hora.
- Input com envio via Enter.
- Realtime subscription na tabela.
- Menção `@nome` autocompleta com usuários da empresa; menção dispara WhatsApp pro mencionado (reusa `notify-lawyer-assigned` genérico → renomeio pra `notify-user-mention`).

## Ordem de implementação

1. Migration: coluna `profiles.whatsapp`, tabela `lead_internal_messages` + RLS + realtime, trigger `notify_lawyer_on_assignment`.
2. Edge function `notify-lawyer-assigned` (também usada para menções).
3. Tool `assign_lead_to_area_lawyer` no `zapi-webhook` + atualização do prompt Laura.
4. UI: aba "Notas internas" no `LeadDetailDrawer` + campo WhatsApp em `Profile.tsx`.

## Fora de escopo (fase 2)

- Notificação push web (só WhatsApp por ora).
- Reatribuição manual em massa.
- Métricas de carga por advogado (dashboard).

Confirma que posso executar assim?
