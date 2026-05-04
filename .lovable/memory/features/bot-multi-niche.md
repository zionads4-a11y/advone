---
name: Bot Multi-Niche (6 nichos)
description: Bot Laura/Julia agora suporta 6 nichos puros (previdenciario, trabalhista, civel, familia, criminal, tributario) + híbrido prev+trab. Cada nicho tem catálogo + bloco de prompt completos.
type: feature
---
6 nichos no `botFlowsCatalog.ts` + `botFlowBlocks.ts`:
- previdenciario (Laura) — 9 fluxos
- trabalhista (Julia) — 6 fluxos
- hibrido (Julia) — combina prev+trab
- civel (Sofia) — 6 fluxos: dano moral, banco, produto/serviço, plano de saúde, cia aérea, fallback
- familia (Helena) — 6 fluxos: divórcio, pensão, guarda, inventário, união estável, fallback
- criminal (Marina) — 6 fluxos: flagrante (URGENTE), inquérito, audiência, recurso/HC, execução penal, fallback
- tributario (Bianca) — 6 fluxos: recuperação, defesa fiscal, planejamento, contratos, societário, fallback

Selector de área em `PracticeSpecialtySelector.tsx` (grid 3 colunas) e tipo `Niche`/`PracticeSpecialty` estendidos. Builder `buildDynamicLauraPrompt` aceita `BuilderNiche` e escolhe nome default do bot por nicho. `CustomFlowDialog` aceita criar fluxo personalizado em qualquer nicho. `useCompanyBotFlows.createCustomFlow` aceita os 6 nichos.

Cada empresa escolhe 1 nicho em /bot-config (ou Configurações). Híbrido só combina prev+trab (não os novos).
