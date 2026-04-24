---
name: Laura/Julia Prompt v5 (todos nichos conversacionais)
description: Versão dos textos do prompt do bot (botFlowBlocks.ts). TODOS os nichos (previdenciário, trabalhista, híbrido) agora usam estilo conversacional sem menus numerados. Trabalhista e híbrido = Julia; previdenciário = Laura.
type: feature
---
Aplicado em `src/components/companies/botFlowBlocks.ts`.

**Princípio comum a TODOS os nichos (v5):**
- SEM menus 1️⃣2️⃣3️⃣ nas perguntas de qualificação.
- Conduzir por TEXTO LIVRE, UMA pergunta por vez, com empatia ativa.
- Identificar `case_type` INTERNAMENTE pela história do lead (sem mostrar opções).
- Os blocos PREV_FLOW_BLOCKS / TRAB_FLOW_BLOCKS (que ainda têm P1/P2 numerados internamente) são REFERÊNCIA INTERNA — o bot reescreve cada pergunta em texto natural.
- `decide_lead` continua sendo chamado ao final (preserva Kanban, scoring, regras).
- Bloco final de agendamento conversacional: "online ou presencial?" + "manhã, tarde ou final do dia?" sem números.
- Bloco de endereços `company_offices` continua igual (lista numerada APENAS para escolher entre múltiplas unidades — única exceção, pra ser claro com endereços).

**Previdenciário puro (niche === "previdenciario") — Laura v5 (NOVO conversacional)**
- Nome: **Laura**.
- Abertura: "Oi! Tudo bem? 😊 Eu sou a Laura, aqui da equipe — especializada em INSS. Me conta o que está acontecendo…" — SEM menu numerado.
- Identifica internamente o case_type entre os 9 fluxos previdenciários (aposentadoria, beneficio_negado, revisao_aposentadoria, bpc_loas, auxilio_invalidez, rmc_rcc, demora_inss, salario_maternidade, fallback_outros).
- Perguntas naturais sugeridas: "Você já deu entrada no INSS?" / "Isso já faz quanto tempo?" / "Você tem algum documento ou viu pelo Meu INSS?"

**Trabalhista puro (niche === "trabalhista") — Julia v3**
- Nome: **Julia**.
- Abertura: "Oi! Tudo bem? 😊 Eu sou a Julia… Me conta… o que aconteceu no seu trabalho?"
- 6 fluxos trabalhistas conversacionais (rescisao_verbas, horas_extras, vinculo_sem_carteira, acidente_trabalho, assedio_moral, fallback_outros).

**Híbrido (niche === "hibrido") — Julia v4**
- Nome: **Julia**.
- Abertura: "Oi! Tudo bem? 😊 Eu sou a Julia… me conta o que aconteceu" — SEM menu 1️⃣ INSS / 2️⃣ Trabalhista.
- Identifica INTERNAMENTE INSS vs Trabalhista por palavras-chave, depois identifica o case_type específico.

Lógica preservada (não mexer):
- `decide_lead` (motor de decisão) — mesmo ponto de chamada
- `company_offices` / `OfficeAddress` — bloco presencial inalterado (única exceção numerada)
- `schedulingLink` — injeção do link no fluxo online
- `getFlowBlock` / `EnabledFlow` / `buildDynamicLauraPrompt` — assinaturas idênticas
- Catálogo `botFlowsCatalog.ts` e tabela `company_bot_flows` — sem mudanças
- PREV_FLOW_BLOCKS e TRAB_FLOW_BLOCKS internos — mantidos como REFERÊNCIA do que coletar; o bot reescreve em texto natural

Chave técnica: `useConversationalScheduling = true` (todos nichos). Regra "ATENÇÃO ESTILO JULIA/LAURA conversacional" injetada no topo do prompt para todos.

Após qualquer mudança o usuário precisa ir em **Empresa → Configurar Bot → Fluxos Atendidos → "Gerar prompt com os fluxos selecionados"** para escrever o novo `whatsapp_configs.ai_prompt`.
