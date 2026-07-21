# Plano: Embedded Signup Meta + Onboarding Escalável

## Objetivo
Permitir que **o próprio cliente conecte o WhatsApp dele** ao AdvOne em 2 minutos, sem você precisar cadastrar Phone Number ID / Token manualmente. Fim do gargalo pra vender em escala.

Como a maioria dos números será **receptiva** (recebe mensagem antes de enviar), o risco de bloqueio cai muito e a estratégia oficial Meta é ideal.

---

## O que vai ser entregue

### 1. Botão "Conectar WhatsApp Oficial (Meta)" no painel do cliente
- Aparece em `/conectar-whatsapp` ao lado do QR Code atual (UaZapi vira "modo teste")
- Abre popup oficial da Meta (Embedded Signup do Facebook SDK)
- Cliente faz login com Facebook Business, escolhe/cria WABA, escolhe número, verifica por SMS/ligação
- Meta devolve `phone_number_id` + `waba_id` + `access_token` automaticamente
- Sistema salva em `whatsapp_configs` sem intervenção do admin

### 2. Edge Function `meta-embedded-signup-exchange`
- Recebe o `code` do popup Meta
- Troca por `access_token` de longa duração usando `META_APP_ID` + `META_APP_SECRET`
- Registra webhook automaticamente na WABA do cliente (`POST /{waba_id}/subscribed_apps`)
- Grava `provider: "meta_cloud"`, phone_number_id, waba_id, token na `whatsapp_configs` da empresa
- Marca `meta_onboarded_at`

### 3. Página `/meta-cloud-setup` fica só como fallback manual
- Mantida pra casos onde o cliente não consegue usar o popup
- Adiciona banner: "Recomendado: peça pro cliente clicar em Conectar no painel dele"

### 4. Health Monitor dos números Meta
- Nova aba em `/ai-usage` (ou nova página `/whatsapp-health`)
- Puxa da Meta a cada 6h via cron:
  - `messaging_limit_tier` (250 / 1k / 10k / 100k / unlimited)
  - `quality_rating` (GREEN / YELLOW / RED)
  - `name_status` (APPROVED / PENDING)
- Alerta vermelho quando algum número entra em YELLOW/RED
- Nova tabela `meta_phone_health` (snapshots diários)

---

## Detalhes técnicos

**Banco:**
- Migration adiciona `meta_onboarded_at`, `meta_business_id`, `meta_quality_rating`, `meta_messaging_limit` em `whatsapp_configs`
- Nova tabela `meta_phone_health` (company_id, phone_number_id, quality, tier, checked_at) com RLS por company + GRANT
- Cron `pg_cron` roda edge `meta-health-check` de 6/6h

**Frontend:**
- Botão dispara `FB.login({config_id: <EMBEDDED_SIGNUP_CONFIG_ID>, response_type: 'code', override_default_response_type: true})`
- Precisa carregar SDK do Facebook (`https://connect.facebook.net/en_US/sdk.js`)
- **Você vai precisar criar 1 configuração de Embedded Signup no Meta Business** (te explico o clique-a-clique no chat depois que aprovar o plano)

**Edge Functions novas:**
- `meta-embedded-signup-exchange` — troca code por token e faz subscribe
- `meta-health-check` — cron 6/6h que roda pra todas empresas com meta ativo

**Secrets:** já temos `META_APP_ID` e `META_APP_SECRET` ✅

---

## O que **você** precisa fazer (fora do código)

1. **Business Verification** na Meta (CNPJ) — libera de 2 → 20 números
2. Criar 1 **Embedded Signup configuration** no Meta Business (te guio passo a passo depois)
3. Me passar o **Config ID** dessa configuração pra eu colar no frontend

---

## Fora de escopo desta rodada (fica pra depois)
- Template Manager visual (criar/aprovar templates dentro do AdvOne)
- Migração de conversas UaZapi → Meta (mantém os dois provedores rodando lado a lado)
- Billing por volume de mensagens Meta
