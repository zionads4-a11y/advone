import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_ADVONE_API_KEY");
    if (!asaasApiKey) {
      return new Response(JSON.stringify({ error: "Asaas não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await admin.auth.getClaims(accessToken);
    if (claimsErr || !claims?.sub) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.sub as string;

    const body = await req.json();
    const { lead_id, value, billing_type, cycle } = body;
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valueNum = Number(value) > 0 ? Number(value) : 697;
    const billing = (billing_type || "UNDEFINED").toUpperCase(); // UNDEFINED | PIX | CREDIT_CARD
    const cyc = (cycle || "MONTHLY").toUpperCase();

    // Load lead
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, name, email, phone, whatsapp, cpf_cliente_final, cpf, company_id")
      .eq("id", lead_id).maybeSingle();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: belongs } = await admin.rpc("user_belongs_to_company", {
      _user_id: userId, _company_id: lead.company_id,
    });
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId, _role: "admin",
    });
    if (!belongs && !isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cpfRaw = (lead.cpf_cliente_final || lead.cpf || "").replace(/\D/g, "");
    if (cpfRaw.length !== 11 && cpfRaw.length !== 14) {
      return new Response(JSON.stringify({ error: "CPF/CNPJ do cliente não cadastrado no lead" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneRaw = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
    const asaasBase = "https://api.asaas.com/v3";

    // Reuse customer if existing
    const { data: prev } = await admin
      .from("lead_subscriptions")
      .select("asaas_customer_id")
      .eq("lead_id", lead.id)
      .not("asaas_customer_id", "is", null)
      .limit(1).maybeSingle();

    let customerId = prev?.asaas_customer_id as string | undefined;
    if (!customerId) {
      const cRes = await fetch(`${asaasBase}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: asaasApiKey },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email || undefined,
          phone: phoneRaw || undefined,
          mobilePhone: phoneRaw || undefined,
          cpfCnpj: cpfRaw,
          notificationDisabled: false,
        }),
      });
      if (!cRes.ok) {
        const t = await cRes.text();
        console.error("Asaas customer error:", t);
        return new Response(JSON.stringify({ error: "Erro ao criar cliente Asaas: " + t }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const c = await cRes.json();
      customerId = c.id;
    }

    const today = new Date().toISOString().split("T")[0];
    const subRes = await fetch(`${asaasBase}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: asaasApiKey },
      body: JSON.stringify({
        customer: customerId,
        billingType: billing,
        value: valueNum,
        nextDueDate: today,
        cycle: cyc,
        description: `Honorários — ${lead.name}`,
        externalReference: `lead_${lead.id}`,
      }),
    });
    if (!subRes.ok) {
      const t = await subRes.text();
      console.error("Asaas sub error:", t);
      return new Response(JSON.stringify({ error: "Erro ao criar assinatura: " + t }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sub = await subRes.json();

    // Try to fetch first payment to get invoice URL
    let invoiceUrl: string | null = null;
    try {
      const payRes = await fetch(`${asaasBase}/payments?subscription=${sub.id}&limit=1`, {
        headers: { access_token: asaasApiKey },
      });
      if (payRes.ok) {
        const pj = await payRes.json();
        invoiceUrl = pj?.data?.[0]?.invoiceUrl ?? null;
      }
    } catch (_) { /* ignore */ }

    const { data: inserted, error: insErr } = await admin
      .from("lead_subscriptions")
      .insert({
        lead_id: lead.id,
        company_id: lead.company_id,
        value: valueNum,
        cycle: cyc,
        billing_type: billing,
        status: "active",
        asaas_customer_id: customerId,
        asaas_subscription_id: sub.id,
        invoice_url: invoiceUrl,
        created_by: userId,
      })
      .select("id")
      .single();
    if (insErr) {
      console.error("Insert lead_subscriptions error:", insErr);
    }

    return new Response(JSON.stringify({
      success: true,
      subscription_id: inserted?.id,
      asaas_subscription_id: sub.id,
      invoice_url: invoiceUrl,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    console.error("create-lead-subscription error:", e);
    return new Response(JSON.stringify({ error: getErrorMessage(e, "Erro") }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
