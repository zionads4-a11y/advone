---
name: Platform plans
description: Os 3 planos da plataforma AdvOne (Mensal R$997, Trimestral R$797/mês, Anual R$597/mês), valores cobrados e modo de cobrança no Asaas
type: feature
---
# Planos AdvOne

A plataforma comercializa **3 planos** com features idênticas — diferença é apenas no compromisso de tempo (quanto mais longo, menor o valor mensal):

| Plano | Mensal exibido | Cobrança Asaas | Modo |
|-------|----------------|----------------|------|
| **Mensal** | R$ 997/mês | R$ 997 recorrente mensal | Recurring (cycle MONTHLY, billingType UNDEFINED → PIX ou cartão) |
| **Trimestral** | R$ 797/mês | R$ 2.391 à vista (3x R$ 797) | One-time payment (Asaas /payments) |
| **Anual** | R$ 597/mês | R$ 7.164 à vista (12x R$ 597) | One-time payment (Asaas /payments) |

## Features (iguais em todos os 3 planos)
- CRM completo com Kanban
- Bot com IA no WhatsApp
- Cadência automática de 5 tentativas
- Agenda integrada
- Monitoramento de até **50 processos** (limite padrão)
- Alertas automáticos de movimentação
- Financeiro integrado com Asaas

## Implementação técnica
- `supabase/functions/create-subscription/index.ts` — cria customer no Asaas e, conforme `planConfig.billing`, dispara `/subscriptions` (mensal) ou `/payments` (trimestral/anual). Salva `value` = valor cobrado (não o equivalente mensal).
- `supabase/functions/change-plan/index.ts` — só atualiza valor recorrente no Asaas se ambos planos forem mensais; demais casos só atualizam o registro local.
- Frontend: `src/pages/Signup.tsx`, `src/pages/LandingPage.tsx`, `src/components/subscription/PlanChangeSection.tsx`.
- Plano padrão na landing: `mensal` (param `?plan=mensal`).

## Planos legados
Os planos antigos (`bimestral`, `essencial`, `profissional`, `elite`) foram **substituídos**. Registros históricos em `subscriptions` ainda aparecem rotulados como "Bimestral (legado)", "Essencial (legado)" etc na página `/subscription` para admins.
