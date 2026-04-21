---
name: Laura Prompt v2 Híbrido
description: Versão v2 dos textos do prompt da Laura (botFlowBlocks.ts). Mudanças principais aplicadas em abr/2026
type: feature
---
Aplicado em `src/components/companies/botFlowBlocks.ts` o "Prompt Híbrido Otimizado v2" (PDF `Prompt_Hibrido_Lovable_Final_v2.pdf`).

Mudanças (apenas TEXTOS — nenhuma lógica/estrutura/tabela alterada):
1. **Abertura híbrida**: quando `niche === "hibrido"`, o prompt inclui um passo inicial 1️⃣ INSS / 2️⃣ Trabalhista que roteia para 2 menus separados (MENU PREVIDENCIÁRIO e MENU TRABALHISTA), montados a partir dos `enabledFlows` filtrados por nicho.
2. **Gatilhos reescritos** em todos os 9 fluxos previdenciários e 6 trabalhistas: mais tensão / consequência / autoridade leve, mantendo o tom acolhedor.
3. **Pré-compromisso (`wants_help`)** continua sendo a última pergunta antes de chamar `decide_lead`.
4. **Bloco final de agendamento** mais vendedor: PASSO 1 com transição clara explicando o que será visto na conversa, PASSO 2 mantém escolha online/presencial respeitando `company_offices` (1 unidade = confirmação direta; >1 = lista numerada), PASSO 3 horário, e Confirmação final.

Lógica preservada:
- `decide_lead` (motor de decisão) — mesmo ponto de chamada
- `company_offices` / `OfficeAddress` — bloco presencial inalterado
- `schedulingLink` — injeção do link no fluxo online
- `getFlowBlock` / `EnabledFlow` / `buildDynamicLauraPrompt` — assinaturas idênticas
- Catálogo `botFlowsCatalog.ts` e tabela `company_bot_flows` — sem mudanças

Após qualquer mudança o usuário precisa ir em **Empresa → Configurar Bot → Fluxos Atendidos → "Gerar prompt com os fluxos selecionados"** para escrever o novo `whatsapp_configs.ai_prompt`.
