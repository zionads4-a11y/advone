import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-webhook`;

async function refreshGoogleToken(supabaseClient: any, integration: any) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google credentials not configured");
  if (!integration.refresh_token) throw new Error("No refresh token available");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: integration.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await response.json();
  if (tokens.error) throw new Error(`Failed to refresh token: ${tokens.error_description || tokens.error}`);

  const updateData: any = {
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (tokens.refresh_token) updateData.refresh_token = tokens.refresh_token;
  await supabaseClient.from("user_integrations").update(updateData).eq("id", integration.id);
  return tokens.access_token;
}

async function stopChannel(accessToken: string, channelId: string, resourceId: string) {
  try {
    await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: channelId, resourceId }),
    });
  } catch (e) {
    console.warn("stopChannel failed (ignored):", e);
  }
}

async function registerWatch(userId: string) {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: integration, error } = await supabaseClient
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error || !integration) {
    return { ok: false, error: "Google integration not found" };
  }

  let accessToken = integration.access_token;
  if (new Date(integration.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
    accessToken = await refreshGoogleToken(supabaseClient, integration);
  }

  // Para canal existente antes de criar novo (idempotente)
  if (integration.watch_channel_id && integration.watch_resource_id) {
    await stopChannel(accessToken, integration.watch_channel_id, integration.watch_resource_id);
  }

  const channelId = crypto.randomUUID();
  const channelToken = crypto.randomUUID();

  // Google permite TTL máximo de ~7 dias para events watch.
  // Pedimos 7 dias - 1 hora para ter folga na renovação.
  const ttlMs = 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;
  const expirationMs = Date.now() + ttlMs;

  const watchResp = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: WEBHOOK_URL,
        token: channelToken,
        expiration: String(expirationMs),
      }),
    },
  );

  const watchData = await watchResp.json();
  if (!watchResp.ok || watchData.error) {
    console.error("Watch register failed:", watchData);
    return { ok: false, error: watchData.error?.message || "watch failed", details: watchData };
  }

  const expiration = watchData.expiration
    ? new Date(parseInt(watchData.expiration, 10)).toISOString()
    : new Date(expirationMs).toISOString();

  await supabaseClient
    .from("user_integrations")
    .update({
      watch_channel_id: watchData.id || channelId,
      watch_resource_id: watchData.resourceId,
      watch_expiration: expiration,
      watch_token: channelToken,
      sync_token: null, // força full sync na próxima execução para alinhar baseline
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  return {
    ok: true,
    user_id: userId,
    channel_id: watchData.id,
    resource_id: watchData.resourceId,
    expiration,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;
    const all = body?.all === true;

    if (all) {
      // Backfill — registra para todos os usuários com integração ativa
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: integrations, error } = await admin
        .from("user_integrations")
        .select("user_id")
        .eq("provider", "google")
        .eq("sync_enabled", true);

      if (error) throw error;

      const results: any[] = [];
      for (const integ of integrations ?? []) {
        try {
          const r = await registerWatch(integ.user_id);
          results.push(r);
        } catch (e: any) {
          results.push({ ok: false, user_id: integ.user_id, error: e.message });
        }
      }
      return new Response(JSON.stringify({ success: true, total: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await registerWatch(userId);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("watch-register error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
