import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PACKAGE_PRICE = 97;
const PROCESSES_PER_PACKAGE = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_ADVONE_API_KEY");

    if (!asaasApiKey) {
      return new Response(JSON.stringify({ error: "Chave Asaas não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, quantity } = await req.json();

    if (!company_id || !quantity || quantity < 1) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: company_id, quantity" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user belongs to company
    const { data: belongs } = await adminClient.rpc("user_belongs_to_company", {
      _user_id: user.id, _company_id: company_id,
    });
    if (!belongs) {
      return new Response(JSON.stringify({ error: "Sem permissão para esta empresa" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalValue = PACKAGE_PRICE * quantity;
    const totalProcesses = PROCESSES_PER_PACKAGE * quantity;

    // Get user profile for Asaas customer
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    // Check if user already has an Asaas customer ID from subscriptions
    const { data: existingSub } = await adminClient
      .from("subscriptions")
      .select("asaas_customer_id")
      .eq("user_id", user.id)
      .not("asaas_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    // Also check from previous monitoring packages
    const { data: existingPkg } = await adminClient
      .from("monitoring_packages")
      .select("asaas_customer_id")
      .eq("user_id", user.id)
      .not("asaas_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let asaasCustomerId = existingSub?.asaas_customer_id || existingPkg?.asaas_customer_id;

    const asaasBaseUrl = "https://api.asaas.com/v3";

    // Create Asaas customer if needed
    if (!asaasCustomerId) {
      const customerRes = await fetch(`${asaasBaseUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify({
          name: profile?.full_name || user.email,
          email: user.email,
          phone: profile?.phone || undefined,
          notificationDisabled: false,
        }),
      });

      if (!customerRes.ok) {
        console.error("Asaas customer error:", await customerRes.text());
        return new Response(JSON.stringify({ error: "Erro ao criar cliente no Asaas" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customer = await customerRes.json();
      asaasCustomerId = customer.id;
    }

    // 1. Create immediate charge (first payment)
    const today = new Date().toISOString().split("T")[0];
    const chargeRes = await fetch(`${asaasBaseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: totalValue,
        dueDate: today,
        description: `AdvOne - Pacote Monitoramento (${quantity}x ${PROCESSES_PER_PACKAGE} processos)`,
        externalReference: `monitoring_${company_id}`,
      }),
    });

    let asaasPaymentId = null;
    if (chargeRes.ok) {
      const chargeData = await chargeRes.json();
      asaasPaymentId = chargeData.id;
    } else {
      console.error("Asaas charge error:", await chargeRes.text());
    }

    // 2. Create recurring subscription for next months
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextDueDate = nextMonth.toISOString().split("T")[0];

    const subRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: totalValue,
        nextDueDate,
        cycle: "MONTHLY",
        description: `AdvOne - Pacote Monitoramento Mensal (${quantity}x ${PROCESSES_PER_PACKAGE} processos)`,
        externalReference: `monitoring_sub_${company_id}`,
      }),
    });

    let asaasSubscriptionId = null;
    if (subRes.ok) {
      const subData = await subRes.json();
      asaasSubscriptionId = subData.id;
    } else {
      console.error("Asaas subscription error:", await subRes.text());
    }

    // 3. Save monitoring package record
    const { data: pkg, error: pkgError } = await adminClient
      .from("monitoring_packages")
      .insert({
        company_id,
        user_id: user.id,
        quantity,
        processes_per_package: PROCESSES_PER_PACKAGE,
        value: totalValue,
        status: "pending",
        asaas_payment_id: asaasPaymentId,
        asaas_subscription_id: asaasSubscriptionId,
        asaas_customer_id: asaasCustomerId,
      })
      .select("id")
      .single();

    if (pkgError) {
      console.error("Error saving monitoring package:", pkgError);
      return new Response(JSON.stringify({ error: "Erro ao salvar pacote" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      package_id: pkg.id,
      total_processes: totalProcesses,
      total_value: totalValue,
      asaas_payment_id: asaasPaymentId,
      asaas_subscription_id: asaasSubscriptionId,
      message: "Cobrança criada! O monitoramento será liberado após a confirmação do pagamento.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Purchase monitoring error:", error);
    const msg = getErrorMessage(error, "Erro desconhecido");
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
