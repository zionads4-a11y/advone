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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Pega todos os usuários com integração Google ativa
    const { data: integrations, error } = await admin
      .from("user_integrations")
      .select("user_id")
      .eq("provider", "google")
      .eq("sync_enabled", true);

    if (error) throw error;

    const results: any[] = [];
    for (const integ of integrations ?? []) {
      try {
        const { error: invokeErr } = await admin.functions.invoke("google-calendar-sync", {
          body: { userId: integ.user_id },
        });
        results.push({ user_id: integ.user_id, ok: !invokeErr, error: invokeErr?.message });
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
