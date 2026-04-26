---
name: Endereços de unidades dinâmicos por empresa (Laura)
description: O prompt da Laura no zapi-webhook NUNCA pode ter endereços hardcoded. Endereços vêm sempre de company_offices da empresa atual (filtrado por company_id). Se a empresa não tiver unidades cadastradas, a Laura é proibida de inventar/citar endereços de outros escritórios.
type: constraint
---
**O bug original (corrigido em 2026-04-26):**
`buildSDRPrompt` em `supabase/functions/zapi-webhook/index.ts` tinha hardcoded as 2 unidades da Dra. Gisele (Ananindeua/Cidade Nova-Belém). Toda empresa que perguntasse o endereço recebia o endereço da Gisele — inclusive Dra. Caroline, que não tem unidades cadastradas.

**Regra inviolável:**
1. `buildSDRPrompt(config, leadName, offices)` recebe `company_offices` (filtrados por `company_id` + `is_active`) carregados em `handleAgentPhase` antes da chamada.
2. O bloco "PRESENCIAL" do prompt é gerado a partir dessa lista:
   - **0 unidades** → Laura responde "vou alinhar com o time e te passo" e oferece online. NUNCA inventa endereço.
   - **1 unidade** → mostra a única.
   - **N unidades** → lista numerada com `name`, `address`, `complement`, `reference_point`, `maps_url`.
3. O prompt agora carrega a regra explícita: "🚫 NUNCA invente endereços, ruas, bairros ou telefones. Endereços de outros escritórios são PROIBIDOS."

**Por que:** Compartilhar endereço errado entre empresas é uma falha gravíssima de isolamento multi-tenant — quebra confiança e pode comprometer LGPD/contratos.

**Onde aplicar:** qualquer novo prompt do bot que mencione endereços precisa ler de `company_offices` por `company_id`, nunca embutir literais.
