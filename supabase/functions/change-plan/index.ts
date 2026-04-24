import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Charged value per plan (NOT the monthly equivalent)
// mensal:    R$ 997 recorrente mensal
// bimestral: R$ 1.594 à vista (2x R$ 797)
// anual:     R$ 7.164 à vista (12x R$ 597)
const PLAN_VALUES: Record<string, number> = {
  mensal: 997,
  bimestral: 1594,
  anual: 7164,
};

const STANDARD_MAX_PROCESSES = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_ADVONE_API_KEY")!;

    // Verify user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { new_plan } = await req.json();
    if (!new_plan || !PLAN_VALUES[new_plan]) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (subscription.plan === new_plan) {
      return new Response(JSON.stringify({ error: "Você já está neste plano" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newValue = PLAN_VALUES[new_plan];

    // Update Asaas subscription if exists (only meaningful for recurring monthly plan)
    if (subscription.asaas_subscription_id && subscription.plan === "mensal" && new_plan === "mensal") {
      const asaasBase = "https://api.asaas.com/v3";
      const asaasRes = await fetch(`${asaasBase}/subscriptions/${subscription.asaas_subscription_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          access_token: asaasApiKey,
        },
        body: JSON.stringify({ value: newValue }),
      });

      if (!asaasRes.ok) {
        const errorData = await asaasRes.text();
        console.error("Asaas update error:", errorData);
        return new Response(JSON.stringify({ error: "Erro ao atualizar no gateway de pagamento" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Update local subscription
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ plan: new_plan, value: newValue, updated_at: new Date().toISOString() })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("DB update error:", updateError);
      return new Response(JSON.stringify({ error: "Erro ao atualizar assinatura" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure standard monitoring limit for the company
    if (subscription.company_id) {
      await supabase
        .from("company_monitoring_plans")
        .upsert({
          company_id: subscription.company_id,
          plan_type: "professional",
          max_processes: STANDARD_MAX_PROCESSES,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" });
    }

    return new Response(JSON.stringify({ success: true, plan: new_plan, value: newValue }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Change plan error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
