---
name: Alerta WhatsApp ao criar agendamento (com resumo IA)
description: Toda criação de lead_reminders com reminder_type=meeting dispara mensagem WhatsApp ao(s) advogado(s). A mensagem inclui data/horário, cliente, CPF, contato, título E resumo da conversa gerado por IA (últimas 30 mensagens) via Lovable AI Gateway (gemini-2.5-flash-lite) com fallback para OpenAI gpt-5-mini.
type: feature
---
**Trigger:** `notify_meeting_scheduled()` (DB trigger) → edge function `notify-meeting-scheduled`.

**Roteamento de destinatário:**
1. Se houver `company_niche_alerts` ativo para o nicho do lead → manda pro advogado específico
2. Senão fallback: `whatsapp_configs.alert_whatsapp` ou `companies.whatsapp`

**Filtro:** só dispara quando `created_by = '00000000-0000-0000-0000-000000000000'` (sentinel UUID = criado pela IA). Agendamentos manuais não notificam.

**Resumo da conversa:**
- Lê últimas 30 `whatsapp_messages` do lead (filtro por `phone` + `company_id`)
- Manda pra IA com instrução: "Resumo CURTO (máx 5 bullets) com tipo de caso, dados informados, dores/objetivos, pontos críticos. Bullets com '•'."
- Anexa logo após os campos do agendamento, sob o header `📋 *Resumo da conversa:*`
- Se falhar geração de resumo, mensagem ainda é enviada (sem o resumo)

**Diferença vs lawyer-meeting-reminders:**
- Este alerta dispara UMA VEZ no momento da criação do agendamento
- Os outros (3h e 30min antes) são processados por `process-reminders` cron
