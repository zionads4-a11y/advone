---
name: Laura/Julia Prompt v3 (trabalhista conversacional)
description: Versão dos textos do prompt do bot (botFlowBlocks.ts). Trabalhista puro virou "Julia" conversacional sem menus numerados; previdenciário e híbrido continuam "Laura" v2.
type: feature
---
Aplicado em `src/components/companies/botFlowBlocks.ts`.

**Trabalhista puro (niche === "trabalhista")**
- Nome do bot: **Julia** (não Laura).
- Abertura: "Oi! Tudo bem? 😊 Eu sou a Julia… Me conta… o que aconteceu no seu trabalho?" — SEM menu 1️⃣2️⃣3️⃣.
- Cada um dos 6 fluxos trabalhistas (rescisao_verbas, horas_extras, vinculo_sem_carteira, acidente_trabalho, assedio_moral, fallback_outros) foi reescrito como roteiro CONVERSACIONAL: perguntas em texto livre, uma por vez, com empatia ativa, sem listar opções.
- O bot continua identificando `case_type` internamente e ainda chama `decide_lead` ao final (preserva Kanban + scoring).
- `wants_help` interpreta resposta livre do lead como `sim | duvida` (não pede pra escolher número).
- Bloco final de agendamento (online/presencial + horário) também SEM listar números — texto natural ("online ou presencial?", "mais de manhã, à tarde ou no final do dia?").
- Bloco de endereços `company_offices` continua igual (1 unidade = confirmação direta; >1 = lista numerada — única exceção, pra ser claro com endereços).

**Híbrido (niche === "hibrido")**
- Mantém Laura.
- Continua perguntando 1️⃣ INSS / 2️⃣ Trabalhista no 1º passo.
- Para INSS, usa MENU PREVIDENCIÁRIO numerado (igual v2).
- Para Trabalhista, NÃO mostra menu — segue estilo Julia conversacional internamente.

**Previdenciário puro (niche === "previdenciario")**
- Sem mudanças. Continua Laura + menu numerado v2.

Lógica preservada (não mexer):
- `decide_lead` (motor de decisão) — mesmo ponto de chamada
- `company_offices` / `OfficeAddress` — bloco presencial inalterado
- `schedulingLink` — injeção do link no fluxo online
- `getFlowBlock` / `EnabledFlow` / `buildDynamicLauraPrompt` — assinaturas idênticas
- Catálogo `botFlowsCatalog.ts` e tabela `company_bot_flows` — sem mudanças

Após qualquer mudança o usuário precisa ir em **Empresa → Configurar Bot → Fluxos Atendidos → "Gerar prompt com os fluxos selecionados"** para escrever o novo `whatsapp_configs.ai_prompt`.
