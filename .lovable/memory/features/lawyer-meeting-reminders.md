---
name: Lembretes de reunião enviados ao advogado
description: Além dos lembretes ao lead (6h/2h/30m), o sistema envia 2 avisos ao advogado responsável da empresa — 3h antes e 30min antes — com dados do cliente. Processado em process-reminders/index.ts.
type: feature
---
**Regra:**
- Para cada `lead_reminders` com `reminder_type='meeting'` e `completed=false`, o cron `process-reminders` envia 2 mensagens internas ao advogado:
  - **3h antes** (tolerância ±20min) → marca `lawyer_3h_sent=true`
  - **30min antes** (tolerância ±12min) → marca `lawyer_30m_sent=true`
- Roteamento de destinatário (mesma lógica de `notify-meeting-scheduled`):
  1. Se houver `company_niche_alerts` ativo para o nicho do lead → envia ao(s) advogado(s) específico(s).
  2. Senão, fallback: `whatsapp_configs.alert_whatsapp` ou `companies.whatsapp`.
- Mensagem inclui data/horário, nome do cliente, telefone e título do compromisso.
- Os flags só são marcados como enviados se TODOS os destinatários receberam com sucesso (evita perder envio em caso de falha parcial).

**Diferença vs `notify-meeting-scheduled`:**
- `notify-meeting-scheduled` dispara UMA VEZ no momento em que a IA cria o agendamento.
- Estes lembretes disparam DUAS VEZES próximo ao horário (3h e 30min) para qualquer reunião — manual ou criada pela IA.

**Colunas em `lead_reminders`:** `lawyer_3h_sent`, `lawyer_30m_sent` (boolean, default false).
