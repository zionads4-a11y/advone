---
name: Laura/Julia Prompt v6 (ordem de coleta de dados)
description: v6 do prompt do bot (botFlowBlocks.ts). Reforça ordem OBRIGATÓRIA do agendamento — Modalidade → Unidade → Horário → SÓ ENTÃO nome completo. CPF nunca é pedido pelo bot, só pela equipe humana.
type: feature
---
Aplicado em `src/components/companies/botFlowBlocks.ts`.

**Princípio comum a TODOS os nichos (v5+v6):**
- SEM menus 1️⃣2️⃣3️⃣ nas perguntas de qualificação.
- Conduzir por TEXTO LIVRE, UMA pergunta por vez, com empatia ativa.
- Identificar `case_type` INTERNAMENTE pela história do lead (sem mostrar opções).
- `decide_lead` continua sendo chamado ao final (preserva Kanban, scoring, regras).

**🆕 v6 — REGRA INVIOLÁVEL DE COLETA DE DADOS PESSOAIS:**
1. Lead aceitou conversar (wants_help = sim) ✅
2. Pergunta MODALIDADE (online ou presencial)
3. Se presencial e múltiplas unidades → pergunta UNIDADE
4. Pergunta HORÁRIO (manhã / tarde / final do dia)
5. **SOMENTE AGORA** pede o NOME COMPLETO
6. **CPF NUNCA é pedido pelo bot** — fica pra equipe humana coletar depois.

A regra está cravada em 3 pontos do prompt:
- Seção `IDENTIDADE E TOM` (regra global "🚫 REGRA INVIOLÁVEL DE DADOS PESSOAIS")
- Abertura previdenciária (linha "Nunca peça dados sensíveis...")
- Bloco final de agendamento (PASSO 4 explícito + lista da ordem obrigatória)

**Nichos:**
- Previdenciário puro = **Laura** (conversacional, sem menus)
- Trabalhista puro = **Julia** (conversacional, sem menus)
- Híbrido = **Julia** (identificação interna INSS x Trabalhista)

Lógica preservada (não mexer):
- `decide_lead` (motor de decisão) — mesmo ponto de chamada
- `company_offices` / `OfficeAddress` — bloco presencial inalterado (única exceção numerada)
- `schedulingLink` — injeção do link no fluxo online
- `getFlowBlock` / `EnabledFlow` / `buildDynamicLauraPrompt` — assinaturas idênticas
- Catálogo `botFlowsCatalog.ts` e tabela `company_bot_flows` — sem mudanças
- PREV_FLOW_BLOCKS e TRAB_FLOW_BLOCKS internos — mantidos como REFERÊNCIA

Após qualquer mudança o usuário precisa ir em **Empresa → Configurar Bot → Fluxos Atendidos → "Gerar prompt com os fluxos selecionados"** para reescrever o `whatsapp_configs.ai_prompt` da empresa.
