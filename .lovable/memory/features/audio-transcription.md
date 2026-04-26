---
name: Transcrição de áudio do WhatsApp via Whisper
description: zapi-webhook detecta mensagens de áudio (msg.type=audio/ptt/voice), baixa o arquivo da UaZapi e transcreve via OpenAI Whisper-1 (PT-BR, temperature 0). Texto transcrito vira a messageText normal e segue todo o fluxo da IA. Limite 25MB.
type: feature
---
**Como funciona (supabase/functions/zapi-webhook/index.ts):**

1. Após extrair `phone/messageText/messageType`, se detecta áudio:
   - UaZapi: `msg.type` contém "audio" OU é "ptt"/"voice"
   - URL pode vir em: `msg.audio.url`, `msg.audio.audioUrl`, `msg.mediaUrl`, `msg.fileURL`, `msg.url`, `msg.media.url`
2. Baixa o arquivo, valida tamanho (<25MB — limite do Whisper).
3. Envia pra `https://api.openai.com/v1/audio/transcriptions` com:
   - `model: whisper-1`
   - `language: pt`
   - `temperature: 0` (determinístico, sem alucinação)
4. Substitui `messageText` por `🎤 [áudio transcrito]: {texto}`. O resto do fluxo (IA, kanban, cadência) trata como texto normal.

**Fallbacks (nunca quebra a função):**
- Sem `OPENAI_API_KEY` → loga erro, segue como `[mídia]`
- Falha download → `[áudio recebido — não foi possível transcrever]`
- Falha Whisper → `[áudio recebido — erro ao transcrever]`
- Áudio >25MB → `[áudio muito longo — não transcrito]`

**Custo:** Whisper-1 = $0.006/min. Áudio típico de WhatsApp (15-30s) custa ~$0.003.

**Segurança contra erro de tipo:** Após bloco de áudio, força `messageText = String(messageText ?? "")` pra evitar bug histórico do tipo `messageText.match is not a function`.
