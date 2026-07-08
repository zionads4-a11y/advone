import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1) Validate caller JWT FIRST (before touching Google or body)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = authHeader.replace("Bearer ", "").trim();

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(accessToken);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { code, redirectUri } = body;

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Google credentials not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(`Google error: ${tokens.error_description || tokens.error}`);
    }

    // Service-role client for token persistence (RLS bypass required)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const user = { id: userId };

    // Get existing integration to avoid overwriting refresh_token if it's not provided in this call
    const { data: existingIntegration } = await supabaseClient
      .from("user_integrations")
      .select("refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    const refreshToken = tokens.refresh_token || existingIntegration?.refresh_token;

    // Store tokens in user_integrations
    const { error: upsertError } = await supabaseClient
      .from("user_integrations")
      .upsert({
        user_id: user.id,
        provider: "google",
        access_token: tokens.access_token,
        refresh_token: refreshToken, // Use existing one if new one is missing
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope?.split(" "),
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider"
      });

    if (upsertError) throw upsertError;

    // Registra push notifications (Watch) para sync em tempo real — fire-and-forget
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
      const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const watchPromise = fetch(`${SUPABASE_URL}/functions/v1/google-calendar-watch-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "apikey": SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ userId: user.id }),
      }).then(async (r) => {
        const text = await r.text();
        console.log(`watch-register status=${r.status} body=${text.slice(0, 200)}`);
      }).catch((e) => console.error("watch-register failed:", e));
      // @ts-ignore
      if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
        // @ts-ignore
        (EdgeRuntime as any).waitUntil(watchPromise);
      }
    } catch (e) {
      console.error("Failed to schedule watch register:", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
