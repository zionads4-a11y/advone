## Objetivo

Permitir que cada empresa (escritório) escolha entre dois provedores de WhatsApp:
- **UaZapi** (padrão atual, receptivo, mais barato)
- **Meta Cloud API oficial** (para escritórios que exigem selo verde / zero risco de ban)

Sem quebrar nada do fluxo atual da Laura, cadências, lembretes, ZapSign, mídia, etc.

---

## 1. Modelo de integração

Vamos usar o padrão **BSP-agnóstico**: cada empresa guarda suas próprias credenciais Meta (Phone Number ID, WABA ID, Access Token permanente). Isso permite:
- Onboarding direto (Meta) ou via BSP (360dialog, Gupshup) — só muda o token
- Cada escritório é dono do próprio número/conta Meta
- AdvOne não vira intermediário financeiro da Meta

## 2. Schema (nova migration)

Adicionar na tabela `whatsapp_configs`:

```
provider              text default 'uazapi'   -- 'uazapi' | 'meta_cloud'
meta_phone_number_id  text
meta_waba_id          text
meta_access_token     text                    -- criptografado / apenas edge functions leem
meta_app_id           text
meta_verify_token     text                    -- para validar webhook da Meta
meta_business_id      text
```

Índice parcial `(provider) where provider = 'meta_cloud'` para métricas.

## 3. UI — `WhatsAppConfigDialog.tsx`

Nova aba/toggle no topo do dialog:
- **Provedor**: UaZapi (padrão) | Meta Cloud API (Oficial)
- Se **Meta Cloud API** selecionado, mostra formulário com:
  - Phone Number ID
  - WABA ID
  - Access Token permanente
  - Verify Token (gerado automaticamente, botão "copiar")
  - URL do webhook (readonly, para colar no painel Meta)
  - Instruções passo-a-passo (link para tutorial Meta Business Manager)
- Validação: botão "Testar conexão" que chama edge function.

## 4. Edge Functions

### 4a. `send-whatsapp` — adaptar
Detectar `provider` da config e rotear:
- `uazapi` → fluxo atual (ziondigital.uazapi.com)
- `meta_cloud` → `POST https://graph.facebook.com/v21.0/{phone_number_id}/messages`
  - Texto: mensagem livre (dentro de 24h da última msg do lead)
  - Mídia: upload via `/media` + envio por `media_id`
  - Fora de 24h: bloquear com erro claro `META_OUTSIDE_24H_WINDOW` (fase 2: templates)

### 4b. `meta-webhook` — nova edge function
- `GET`: handshake da Meta (retorna `hub.challenge` se `hub.verify_token` bater)
- `POST`: recebe eventos, valida assinatura `X-Hub-Signature-256`, converte payload Meta → mesmo formato interno usado hoje pelo `zapi-webhook` (mensagem, mídia, status), e reaproveita 100% do pipeline da Laura chamando as mesmas funções internas.
- URL: `https://oonteavjxzkovrzktnie.supabase.co/functions/v1/meta-webhook?company_id=...`

### 4c. `meta-test-connection` — nova
Chama `GET /v21.0/{phone_number_id}` com o token para validar. Retorna nome verificado, quality rating.

## 5. Refatoração leve

Extrair para `supabase/functions/_shared/whatsappProvider.ts`:
```
sendText(config, to, text)
sendMedia(config, to, mediaUrl, type, caption?)
```
Roteia internamente por `config.provider`. `send-whatsapp` e `test-bot-chat` passam a usar esse shared.

## 6. Fluxos que precisam checar janela de 24h (fase 2, não bloqueante agora)

- `process-cadence` — cadências 5 tentativas
- `process-reminders` — lembretes reunião
- `notify-meeting-scheduled` / `notify-process-movement`

Regra: se `provider = meta_cloud` E última msg do lead > 24h → usar **template aprovado** (novo campo `meta_templates` em `whatsapp_configs` — JSONB com nome/idioma de cada template). Se template não configurado, gravar log e não disparar.

Nesta primeira entrega: apenas logar warning e pular envio. Configuração de templates fica para fase 2.

## 7. Segurança

- `meta_access_token` nunca sai do backend (não incluir em SELECT do frontend — RLS policy filtra coluna via view).
- `meta_verify_token` gerado com `crypto.randomUUID()` no momento do save.
- Validação HMAC SHA256 no webhook usando `APP_SECRET` armazenado por empresa OU global (Meta App do AdvOne se formos BSP).

## 8. Ordem de implementação

1. Migration (schema + grants)
2. Shared `whatsappProvider.ts`
3. Edge functions: `meta-webhook`, `meta-test-connection`
4. Adaptar `send-whatsapp` para rotear
5. UI no `WhatsAppConfigDialog` com toggle + form Meta
6. Documentação inline (tooltip com passo-a-passo Meta Business)
7. (Fase 2) Templates Meta + janela 24h em cadências

---

## O que NÃO entra nesta fase

- Embedded Signup da Meta (requer AdvOne virar BSP oficial — decisão comercial)
- Cobrança do add-on Meta no billing_models (definimos preço depois)
- Migração automática de números UaZapi → Meta (é sempre novo cadastro)

---

Pronto para começar pela migration + shared provider + edge function do webhook Meta?
