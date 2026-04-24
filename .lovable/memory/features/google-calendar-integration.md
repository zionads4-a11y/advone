---
name: Google Calendar Integration
description: Integração multitenant Google Calendar por escritório com OAuth per-user, credenciais Client ID/Secret cadastradas por empresa em /company-settings, push automático via trigger e calendário selecionável
type: feature
---
Integração Google Calendar por escritório (multitenant), configurada 100% pelo painel em /company-settings (card GoogleCalendarConfigCard). Cada empresa cadastra suas próprias credenciais OAuth (Client ID, Client Secret, Redirect URI) em `google_oauth_credentials` — não há credenciais globais, evitando dependência de secrets compartilhados.

Tabelas:
- `google_oauth_credentials` (client_id, client_secret, redirect_uri por company_id)
- `google_calendar_connections` (tokens, calendário selecionado, e-mail Google)
- `google_calendar_event_links` (mapping reminder_id ↔ google_event_id)
- `google_calendar_sync_state` (sync_token + webhook channel — preparado para pull bidirecional)

Edge functions:
- `google-calendar-oauth-start`: gera URL de autorização usando Client ID da empresa
- `google-calendar-oauth-callback` (verify_jwt=false): troca code por tokens, cria conexão
- `google-calendar-list`: lista calendários com permissão de escrita
- `google-calendar-push` (verify_jwt=false): chamada pelo trigger `trg_lead_reminders_gcal_push` em INSERT/UPDATE/DELETE de `lead_reminders`. Refresh automático de access_token com Client Secret da empresa.

Redirect URI fixo: `${SUPABASE_URL}/functions/v1/google-calendar-oauth-callback`. O usuário copia da UI e cola no Google Cloud Console. Fluxo: salvar credenciais → conectar conta (popup) → escolher calendário destino. Apenas a página de Configurações foi alterada — agenda e demais features intactas.
