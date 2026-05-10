# Sincronização em Tempo Real — Google Calendar

## Situação atual
- Cron `*/2 * * * *` chama `google-calendar-poll-all` que aciona `google-calendar-sync` para cada usuário com `sync_enabled=true`.
- Latência: até 2 minutos entre criar evento no Google e aparecer no sistema.
- Pull completo a cada execução (janela -30/+90 dias) — pesado e lento.

## Objetivo
Eventos criados/alterados no Google Agenda aparecem no sistema em **segundos**, para **todos os clientes**, e a IA pode consultar disponibilidade atualizada antes de agendar reuniões.

## Solução: Google Calendar Push Notifications (Watch API)

A Google envia um POST HTTP para nosso webhook toda vez que algo muda no calendário do usuário. Recebemos a notificação → disparamos um sync incremental (com `syncToken`, só pega o que mudou).

### Arquitetura

```text
[Usuário cria evento no Google]
            │
            ▼
[Google Calendar API] ──POST──► [/functions/v1/google-calendar-webhook]
                                          │
                                          ▼
                          (lookup integration por channel_id)
                                          │
                                          ▼
                       [google-calendar-sync incremental + syncToken]
                                          │
                                          ▼
                                 [lead_reminders atualizado]
```

### Componentes

**1. Banco — novas colunas em `user_integrations`**
- `watch_channel_id text` — UUID da channel registrada
- `watch_resource_id text` — id do recurso retornado pela Google
- `watch_expiration timestamptz` — quando o canal expira (Google força renovação a cada ~7 dias)
- `sync_token text` — token para sync incremental

**2. Nova edge function `google-calendar-webhook` (verify_jwt=false, público)**
- Recebe headers `X-Goog-Channel-ID`, `X-Goog-Resource-ID`, `X-Goog-Resource-State`
- Busca `user_integrations` por `watch_channel_id`
- Chama `google-calendar-sync` com `userId` (sync incremental)
- Retorna 200 imediatamente

**3. Nova edge function `google-calendar-watch-register`**
- Para um `userId`: chama `POST https://www.googleapis.com/calendar/v3/calendars/primary/events/watch` com webhook URL pública
- Salva `channel_id`, `resource_id`, `expiration` em `user_integrations`
- Se já existe canal anterior, faz `stop` antes (evita duplicatas)

**4. Atualizar `google-calendar-sync` para sync incremental**
- Se `sync_token` existe: usa `syncToken=<token>` na chamada (Google retorna só mudanças desde o último sync)
- Se `410 Gone` (token expirado): faz full sync com janela -30/+90 e gera novo token
- Salva `nextSyncToken` da resposta em `user_integrations.sync_token`
- Mantém compatibilidade com chamadas existentes (poll cron continua funcionando como fallback)

**5. Atualizar `google-calendar-auth` (OAuth callback)**
- Após salvar tokens, chama `google-calendar-watch-register` automaticamente
- Garante que todo cliente novo já entra com push notification ativo

**6. Cron de renovação `google-calendar-watch-renew` (1× por dia)**
- Busca integrações com `watch_expiration < now() + interval '24 hours'`
- Re-registra canal para cada uma
- Cron schedule: `0 3 * * *` (3h da manhã)

**7. Backfill — registrar push para integrações já existentes**
- Edge function admin-only `google-calendar-watch-register-all`
- Chama `watch-register` para cada `user_integrations` ativa
- Rodar uma vez após o deploy

**8. Reduzir frequência do polling como safety net**
- Mudar cron `google-calendar-poll-all-2min` de 2min → 15min
- Push notifications cobrem o tempo real; polling vira backup caso uma notificação se perca

## Disponibilidade para a IA SDR

A IA Laura já consulta `lead_reminders` ao agendar reuniões (verificar slots livres). Com sync near real-time, a tabela reflete o Google em segundos — sem mudança no código da IA.

Adicional opcional: expor função `check_availability(start, end)` para a IA consultar diretamente a tabela antes de propor um horário, evitando conflitos.

## Etapas de implementação

1. Migration: adicionar colunas em `user_integrations`
2. Criar `google-calendar-webhook` (recebe push)
3. Criar `google-calendar-watch-register` (registra canal)
4. Atualizar `google-calendar-sync` com syncToken incremental
5. Atualizar `google-calendar-auth` para registrar watch após OAuth
6. Criar `google-calendar-watch-renew` + cron diário
7. Criar `google-calendar-watch-register-all` (admin) para backfill
8. Reduzir cron de polling para 15min
9. Executar backfill manual nos 3 usuários existentes
10. Validar push end-to-end (criar evento no Google → ver chegando em <10s)

## Considerações técnicas

- **HTTPS público obrigatório** para o webhook — `https://oonteavjxzkovrzktnie.supabase.co/functions/v1/google-calendar-webhook` já é público.
- **Verificação de origem**: validar `X-Goog-Channel-Token` (token secreto que enviamos no `watch` e Google ecoa de volta). Geramos um token aleatório por canal e armazenamos.
- **Race conditions**: se duas notificações chegarem simultaneamente, sync incremental é idempotente (upsert por `google_event_id`).
- **Quota Google**: watch tem limite generoso, mas renewal diária é necessária (canais expiram em até 1 semana).
