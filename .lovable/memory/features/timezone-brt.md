---
name: Agenda/lembretes sempre em horário de Brasília (BRT, UTC-3)
description: Toda gravação de due_at em lead_reminders DEVE usar brtDateTimeToIso/brtLocalInputToIso de @/lib/utils para forçar offset -03:00. NUNCA salvar string sem timezone (Postgres interpreta como UTC) nem confiar no fuso do navegador.
type: constraint
---
**Bug original (corrigido em 2026-04-26):**
- `CreateEventDialog.tsx` salvava `due_at = "${dueDate}T${dueTime}:00"` — string sem timezone. Postgres tratava como UTC, então 10:40 digitado virava 07:40 BRT na exibição.
- `LeadReminders.tsx` usava `new Date(dueAt).toISOString()` no valor de `<input type="datetime-local">`, o que depende do fuso do navegador do operador (quebra se ele estiver em outro país ou com relógio errado).

**Regra:**
- Helper único em `src/lib/utils.ts`:
  - `brtDateTimeToIso(date, time)` para inputs separados (date + time)
  - `brtLocalInputToIso(localValue)` para `<input type="datetime-local">`
- Ambos retornam ISO 8601 com sufixo `-03:00`.
- Qualquer novo formulário que grave em `lead_reminders.due_at`, `recurrence_end`, ou qualquer timestamptz que represente horário comercial brasileiro DEVE usar esses helpers.
- Leitura (`new Date(iso)` para formatar) continua OK porque o banco devolve timestamptz e o navegador converte corretamente para o fuso local.
