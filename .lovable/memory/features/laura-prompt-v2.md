---
name: Julia/Laura Prompt v4 (híbrido conversacional)
description: Versão dos textos do prompt do bot (botFlowBlocks.ts). Trabalhista E híbrido viraram "Julia" conversacional sem menus numerados; previdenciário puro continua "Laura" com menu.
type: feature
---
Aplicado em `src/components/companies/botFlowBlocks.ts`.

**Trabalhista puro (niche === "trabalhista") — Julia v3**
- Nome do bot: **Julia**.
- Abertura: "Oi! Tudo bem? 😊 Eu sou a Julia… Me conta… o que aconteceu no seu trabalho?" — SEM menu 1️⃣2️⃣3️⃣.
- Cada um dos 6 fluxos trabalhistas reescrito como roteiro CONVERSACIONAL.
- Bot identifica `case_type` internamente e ainda chama `decide_lead`.
- Bloco final de agendamento sem números (online/presencial + manhã/tarde/noite em texto natural).

**Híbrido (niche === "hibrido") — Julia v4 (NOVO)**
- Nome do bot: **Julia** (não mais Laura).
- Abertura: "Oi! Tudo bem? 😊 Eu sou a Julia… me conta o que aconteceu que eu vou te ajudar a entender melhor o seu caso" — SEM menu 1️⃣ INSS / 2️⃣ Trabalhista.
- Identifica INTERNAMENTE se é INSS (palavras-chave: aposentadoria, INSS, BPC, benefício, perícia, RMC/RCC, salário-maternidade…) ou TRABALHISTA (demissão, FGTS, horas extras, assédio, sem registro, acidente trabalho…).
- Após identificar, identifica também o `case_type` específico (silenciosamente) e segue o fluxo correspondente.
- Os blocos PREV_FLOW_BLOCKS (que ainda têm P1/P2 numerados) viram REFERÊNCIA INTERNA — Julia REESCREVE cada pergunta em texto livre.
- Bloco final de agendamento também conversacional (online/presencial + manhã/tarde/noite sem números). Bloco de endereços `company_offices` continua igual (lista numerada apenas para escolher entre múltiplas unidades — única exceção).

**Previdenciário puro (niche === "previdenciario")**
- Sem mudanças. Continua Laura + menu numerado.

Lógica preservada (não mexer):
- `decide_lead` (motor de decisão) — mesmo ponto de chamada
- `company_offices` / `OfficeAddress` — bloco presencial inalterado
- `schedulingLink` — injeção do link no fluxo online
- `getFlowBlock` / `EnabledFlow` / `buildDynamicLauraPrompt` — assinaturas idênticas
- Catálogo `botFlowsCatalog.ts` e tabela `company_bot_flows` — sem mudanças

Chave técnica: `useConversationalScheduling = niche === "trabalhista" || niche === "hibrido"` controla tanto o bloco final de agendamento quanto a regra "ATENÇÃO ESTILO JULIA" no topo do prompt.

Após qualquer mudança o usuário precisa ir em **Empresa → Configurar Bot → Fluxos Atendidos → "Gerar prompt com os fluxos selecionados"** para escrever o novo `whatsapp_configs.ai_prompt`.
