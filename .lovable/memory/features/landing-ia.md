---
name: Landing /IA — plano Laura SDR R$ 397/mês
description: Landing standalone em /IA (e /ia) que vende a SDR virtual Laura por R$ 397/mês exclusivo desta página. Captura leads em landing_ia_leads com formulário híbrido (lead + agendamento de demo).
type: feature
---
**Rota:** `/IA` e `/ia` (alias) → `src/pages/LandingIA.tsx`. Pública (fora do AppLayout).

**Identidade visual:** Reaproveita header, logo, hero-bg, gradient-primary, Reveal e InteractiveChatDemo da landing principal (mesma identidade AdvOne).

**Oferta exclusiva:** Plano "Laura SDR" R$ 397/mês, sem fidelidade. Esse preço NÃO aparece em nenhuma outra página — é o gancho da campanha de tráfego direcionada a advogados solo / escritórios pequenos.

**Captura:** Tabela `landing_ia_leads` (RLS: insert público para anon+authenticated, gerência só admin/member). Campos: name, whatsapp, email, oab, practice_area, preferred_date, preferred_time, message + UTMs. Validação client-side com zod.

**Seções:**
1. Hero + InteractiveChatDemo
2. Dores (3 cards destrutivos)
3. Features Laura (6 cards)
4. Comparativo Sem Laura vs Com Laura
5. Plano R$ 397/mês destacado
6. Formulário híbrido (lead + agendamento)
7. FAQ (6 perguntas)
8. CTA final + Footer

**Importante:**
- O plano R$ 397 é apenas marketing — quando o lead confirma, o time comercial provisiona manualmente uma empresa com permissões reduzidas (só Conversations + Agenda + Bot).
- O fluxo NÃO faz checkout automático. É captura de lead → contato manual → agendamento de demo → fechamento.
- UTMs são lidos da query string e gravados no insert para atribuição de campanha.
