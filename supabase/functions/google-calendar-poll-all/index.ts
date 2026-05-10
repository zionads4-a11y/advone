import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: integrations, error } = await admin
      .from("user_integrations")
      .select("user_id")
      .eq("provider", "google")
      .eq("sync_enabled", true);

    if (error) throw error;

    const results: any[] = [];
    for (const integ of integrations ?? []) {
      try {
        // Chamada HTTP direta (mais confiável que functions.invoke entre edges)
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "apikey": SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ userId: integ.user_id, incremental: true }),
        });
        const text = await resp.text();
        let parsed: any = null;
        try { parsed = JSON.parse(text); } catch { /* ignore */ }
        results.push({
          user_id: integ.user_id,
          ok: resp.ok,
          status: resp.status,
          ...(resp.ok ? { count: parsed?.count } : { error: parsed?.error || text.slice(0, 200) }),
        });
      } catch (e: any) {
        results.push({ user_id: integ.user_id, ok: false, error: e.message });
      }
    }

    console.log(`Polled ${results.length} users:`, JSON.stringify(results));

    return new Response(
      JSON.stringify({ success: true, total: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Poll error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
