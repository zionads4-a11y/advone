---
name: Cadência e nudges com IA contextual (lê conversa e continua de onde parou)
description: process-cadence NÃO usa mais mensagens prontas. Tanto os nudges de inatividade (30/90/150/180 min) quanto a cadência de 5 dias geram texto via Lovable AI Gateway, lendo as últimas 30 mensagens e continuando o assunto exato em aberto. Templates em CADENCE_MESSAGES/INACTIVITY_NUDGES viram apenas FALLBACK quando IA falha.
type: feature
---
**Como funciona (supabase/functions/process-cadence/index.ts):**

1. **Nudges de inatividade** (30/90/150/180 min sem resposta do lead):
   - `generateContextualNudge()` carrega `whatsapp_configs.ai_prompt` + `communication_tone` da empresa
   - Lê últimas 30 mensagens da conversa
   - Manda pra `google/gemini-2.5-flash` via Lovable AI Gateway com instruções: "leia, identifique última pergunta sua em aberto, continue de onde parou, não se reapresente, sem soar robô"
   - Se IA falha → fallback para `INACTIVITY_NUDGES[i].message`

2. **Cadência diária** (1º ao 5º follow-up):
   - Mesma lógica: lê histórico, gera continuação natural usando `ai_prompt` da empresa como base
   - Mensagem 1 (10min) → ainda muito próxima da conversa, IA retoma exatamente
   - Mensagens 2-5 (1d/2d/3d/4d) → IA pode acrescentar `scheduling_link` se ainda não estiver na conversa
   - Fallback → `CADENCE_MESSAGES[day_number]`

**Por que importa:**
Antes o bot mandava "Oi {nome}, fiquei te esperando aqui…" mesmo se a última mensagem dele tinha sido "Prefere de manhã ou de tarde?". Resultado: lead achava bot quebrado, conversa perdia sentido.

Agora o bot retoma assim: "Oi Maria, e aí, conseguiu ver? Manhã ou tarde fica melhor pra você?"

**Regras gravadas no system prompt do follow-up:**
- NÃO se reapresentar
- NÃO repetir perguntas já feitas
- NÃO mandar "olá novamente" / "conforme conversamos"
- Identificar última pergunta em aberto e retomar ESSA
- Tom curto (1-3 linhas), humano, usando nome do lead
- Output puro (sem aspas, sem JSON)

**Não mexer:**
- `_logic.ts` (CADENCE_MESSAGES, INACTIVITY_NUDGES, MAX_CADENCE_ATTEMPTS) — usado como fallback e nos testes
- Lógica de cancelamento (lead respondeu, status mudou, IA decidiu "lost") — preservada
- Movimentação de Kanban a cada follow-up — preservada
