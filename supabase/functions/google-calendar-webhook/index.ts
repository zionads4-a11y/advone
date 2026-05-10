import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-channel-token, x-goog-resource-id, x-goog-resource-state, x-goog-resource-uri, x-goog-message-number",
};

// Recebe push notifications da Google Calendar API.
// Headers enviados pela Google:
//   X-Goog-Channel-ID       — id do canal que registramos
//   X-Goog-Channel-Token    — token secreto que enviamos no watch (validamos)
//   X-Goog-Resource-ID      — id do recurso
//   X-Goog-Resource-State   — sync | exists | not_exists
//   X-Goog-Message-Number   — número sequencial da mensagem
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Consome corpo (Google envia POST vazio)
  try { await req.text(); } catch { /* ignore */ }

  const channelId = req.headers.get("x-goog-channel-id");
  const channelToken = req.headers.get("x-goog-channel-token");
  const resourceState = req.headers.get("x-goog-resource-state");

  // Sempre responde 200 rápido — Google considera erro >2xx e tenta retransmitir.
  // Logamos e disparamos o sync em background.
  if (!channelId) {
    return new Response(JSON.stringify({ ok: true, ignored: "missing channel id" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // sync inicial enviado pela Google ao registrar o canal — só confirma; ignoramos
  if (resourceState === "sync") {
    console.log(`[webhook] channel ${channelId} confirmed (sync)`);
    return new Response(JSON.stringify({ ok: true, state: "sync" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Resolve a integração pelo channel_id (e valida o token quando presente)
  const { data: integration, error } = await admin
    .from("user_integrations")
    .select("user_id, watch_token")
    .eq("watch_channel_id", channelId)
    .maybeSingle();

  if (error || !integration) {
    console.warn(`[webhook] channel ${channelId} não encontrado em user_integrations`);
    return new Response(JSON.stringify({ ok: true, ignored: "unknown channel" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (integration.watch_token && channelToken && integration.watch_token !== channelToken) {
    console.warn(`[webhook] channel ${channelId} token inválido`);
    return new Response(JSON.stringify({ ok: true, ignored: "invalid token" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Dispara sync incremental em background — não bloqueia a resposta para a Google
  const userId = integration.user_id;
  const fireAndForget = (async () => {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "apikey": SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ userId, incremental: true }),
      });
      const text = await resp.text();
      console.log(`[webhook] sync user=${userId} status=${resp.status} body=${text.slice(0, 200)}`);
    } catch (e) {
      console.error(`[webhook] sync error user=${userId}:`, e);
    }
  })();

  // Não esperamos o sync terminar — Google só precisa do 200
  // (mas precisamos manter a referência viva)
  // @ts-ignore EdgeRuntime exists in Supabase Deno runtime
  if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
    // @ts-ignore
    (EdgeRuntime as any).waitUntil(fireAndForget);
  }

  return new Response(JSON.stringify({ ok: true, state: resourceState }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
