## Objetivo
Reestruturar o pricing de todas as landing pages públicas do AdvOne para a nova escada de 3 planos:

- **AdvOne IA — R$ 397/mês**: Atendimento 24h, Qualificação, Agendamento, Atendimento a clientes atuais
- **AdvOne Gestão — R$ 597/mês**: CRM jurídico, Pipeline, Automações, Gestão da equipe, Relatórios
- **AdvOne Complete — R$ 897/mês**: Tudo da IA + tudo da Gestão + Integrações + Recursos exclusivos

## Escopo (somente frontend / conteúdo)

Vou alterar apenas a camada de apresentação das landing pages públicas. Backend (Asaas, `create-subscription`, `billing/platform-plans`, tabelas `subscriptions`) **não** será tocado nesta etapa — os planos atuais (Mensal/Trimestral/Anual R$997/797/597) continuam funcionando no fluxo de checkout. Isso evita quebrar assinaturas ativas. Assim que você validar a nova narrativa, faço uma segunda etapa mexendo em Asaas/Signup.

### Arquivos a editar

1. **`src/pages/LandingPage.tsx`** — substituir a seção de pricing atual (Mensal/Trimestral/Anual R$997/797/597) pelos 3 novos cards (IA / Gestão / Complete). Ajustar copy do hero se mencionar preço antigo.
2. **`src/pages/LandingIA.tsx`** — hoje vende só "Laura SDR R$ 397". Vou reposicionar como **AdvOne IA R$ 397** mantendo a mesma captura em `landing_ia_leads`, e adicionar um bloco "Precisa de mais? Conheça Gestão e Complete" com link para `/`.
3. **`src/pages/CrmAdvogados.tsx`** — atualizar JSON-LD `offers.price` de `"397"` para `"597"` (agora é o plano Gestão), atualizar CTA/copy para refletir "AdvOne Gestão".
4. **`src/pages/WhatsappAdvogados.tsx`** — reforçar que essa página vende AdvOne IA (R$ 397), CTA "Ativar no meu WhatsApp" segue apontando para `/auth`.
5. **`src/pages/SdrIaJuridico.tsx`** — mesma linha da WhatsappAdvogados (é venda de IA R$ 397). Ajustar preço/nome se houver menção.
6. **`src/pages/Index.tsx`** — se tiver seção de pricing, alinhar aos 3 novos planos.
7. **`src/pages/About.tsx`, `Blog.tsx`, `PostLgpdEscritorios.tsx`, `PostQualificarLeads.tsx`, `PostSdrHumanoVsIa.tsx`** — varrer com `rg` por "997", "797", "597", "Mensal", "Trimestral", "Anual", "Essencial", "Profissional", "Elite" e ajustar somente ocorrências de pricing/nome de plano.

### Estrutura visual dos 3 cards (padrão em todas as LPs)

```text
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  AdvOne IA     │ │ AdvOne Gestão  │ │ AdvOne Complete│
│  R$ 397/mês    │ │  R$ 597/mês    │ │  R$ 897/mês    │
│                │ │  ★ Popular     │ │  Tudo incluso  │
│ • Atend. 24h   │ │ • CRM jurídico │ │ • Tudo da IA   │
│ • Qualificação │ │ • Pipeline     │ │ • Tudo Gestão  │
│ • Agendamento  │ │ • Automações   │ │ • Integrações  │
│ • Clientes     │ │ • Gestão time  │ │ • Recursos     │
│                │ │ • Relatórios   │ │   exclusivos   │
│ [Começar]      │ │ [Começar]      │ │ [Falar comigo] │
└────────────────┘ └────────────────┘ └────────────────┘
```

Gestão será marcado como "Mais popular" (destaque com borda primária) — é a âncora psicológica clássica de escada de 3 planos.

### Detalhes técnicos

- Usar tokens semânticos do design system (`bg-card`, `border-primary`, `text-primary`) — nada de cor hardcoded.
- Todos os CTAs continuam apontando para `/auth` (fluxo de signup atual), exceto Complete que pode apontar para `/contact` ou WhatsApp comercial se você preferir venda consultiva (me confirma na aprovação).
- SEO: atualizar `<meta description>` e JSON-LD com o novo preço mínimo (`"397"`) em toda LP para refletir o menor ticket possível.
- Nenhuma mudança em rotas, backend, migrations, edge functions ou `billingModels.ts`.

### Fora do escopo desta etapa

- Alterar Asaas / `create-subscription` / `Signup.tsx` (fluxo de compra real).
- Criar novos `billing_model` no banco.
- Mexer em `mem://billing/platform-plans` (atualizo a memória só depois que o backend for migrado, para não descrever algo que não existe no código).

Me aprove que já implemento a troca das LPs. Depois disso, se quiser, planejo a segunda etapa (Signup + Asaas) num plano separado.