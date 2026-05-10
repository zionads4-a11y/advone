import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cron diário — renova canais que vão expirar em <24h ou que nunca foram registrados.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Pega: integrações ativas onde watch_expiration < cutoff OU watch_channel_id é null
    const { data: integrations, error } = await admin
      .from("user_integrations")
      .select("user_id, watch_channel_id, watch_expiration")
      .eq("provider", "google")
      .eq("sync_enabled", true);

    if (error) throw error;

    const toRenew = (integrations ?? []).filter((i: any) =>
      !i.watch_channel_id ||
      !i.watch_expiration ||
      new Date(i.watch_expiration).toISOString() < cutoff
    );

    const results: any[] = [];
    for (const integ of toRenew) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-watch-register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "apikey": SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ userId: integ.user_id }),
        });
        const data = await resp.json().catch(() => ({}));
        results.push({ user_id: integ.user_id, ok: resp.ok, status: resp.status, ...data });
      } catch (e: any) {
        results.push({ user_id: integ.user_id, ok: false, error: e.message });
      }
    }

    console.log(`Renewed ${results.length} channels:`, JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, renewed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Renew error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
