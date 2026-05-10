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
  const startTime = Date.now();
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const channelId = req.headers.get("x-goog-channel-id");
  const channelToken = req.headers.get("x-goog-channel-token");
  const resourceId = req.headers.get("x-goog-resource-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let userId: string | null = null;
  let finalStatus = 200;
  let errorMsg: string | null = null;

  try {
    // 1. Validação básica
    if (!channelId) {
      finalStatus = 400;
      errorMsg = "Missing x-goog-channel-id header";
      return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resposta rápida para 'sync'
    if (resourceState === "sync") {
      console.log(`[webhook] channel ${channelId} confirmed (sync)`);
      return new Response(JSON.stringify({ ok: true, state: "sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Resolve integração
    const { data: integration, error } = await admin
      .from("user_integrations")
      .select("user_id, watch_token")
      .eq("watch_channel_id", channelId)
      .maybeSingle();

    if (error || !integration) {
      finalStatus = 404;
      errorMsg = `Channel ${channelId} not found in user_integrations`;
      console.warn(`[webhook] ${errorMsg}`);
      return new Response(JSON.stringify({ ok: true, ignored: "unknown channel" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = integration.user_id;

    // 4. Valida token
    if (integration.watch_token && channelToken && integration.watch_token !== channelToken) {
      finalStatus = 401;
      errorMsg = "Invalid channel token";
      console.warn(`[webhook] channel ${channelId} token inválido`);
      return new Response(JSON.stringify({ ok: true, ignored: "invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Dispara sync em background
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

    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      (EdgeRuntime as any).waitUntil(fireAndForget);
    }

    return new Response(JSON.stringify({ ok: true, state: resourceState }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    finalStatus = 500;
    errorMsg = e.message;
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    // Log do webhook (exceto OPTIONS)
    if (req.method !== "OPTIONS") {
      admin.from("google_calendar_webhook_logs").insert({
        channel_id: channelId,
        resource_id: resourceId,
        resource_state: resourceState,
        status_code: finalStatus,
        error_message: errorMsg,
        user_id: userId,
        processing_time_ms: Date.now() - startTime,
        payload: { headers: Object.fromEntries(req.headers.entries()) }
      }).then(({ error }) => {
        if (error) console.error("[webhook] Error saving log:", error);
      });
    }
  }
});
