import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Standard monitoring limit for all 3 plans
const STANDARD_MAX_PROCESSES = 50;

// Plan configuration:
// - mensal:    R$ 997/mês recorrente (PIX ou cartão)
// - bimestral: R$ 1.594 cobrança única (2x R$ 797 — equivalente a R$ 797/mês)
// - anual:     R$ 7.164 cobrança única (12x R$ 597 — equivalente a R$ 597/mês)
type BillingMode = "recurring_monthly" | "one_time";

interface PlanInfo {
  monthlyEquivalent: number; // shown to user
  chargedValue: number;       // what Asaas actually charges
  billing: BillingMode;
  description: string;
}

const PLAN_CONFIG: Record<string, PlanInfo> = {
  mensal:    { monthlyEquivalent: 997, chargedValue: 997,  billing: "recurring_monthly", description: "AdvOne — Plano Mensal (R$ 997/mês)" },
  bimestral: { monthlyEquivalent: 797, chargedValue: 1594, billing: "one_time",          description: "AdvOne — Plano Bimestral (2x R$ 797 = R$ 1.594 à vista)" },
  anual:     { monthlyEquivalent: 597, chargedValue: 7164, billing: "one_time",          description: "AdvOne — Plano Anual (12x R$ 597 = R$ 7.164 à vista)" },
};

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

    const { email, password, full_name, phone, cpf_cnpj, plan, company_name } = await req.json();

    if (!email || !password || !full_name || !plan || !cpf_cnpj) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, full_name, cpf_cnpj, plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planConfig = PLAN_CONFIG[plan];
    if (!planConfig) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create auth user
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      const msg = createError.message.includes("already been registered")
        ? "Este email já está cadastrado"
        : "Erro ao criar conta: " + createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // 2. Update role to gerente
    await adminClient.from("user_roles").update({ role: "gerente" }).eq("user_id", userId);

    // 3. Create company
    const officeName = company_name || `Escritório ${full_name}`;
    const { data: company, error: companyErr } = await adminClient
      .from("companies")
      .insert({ name: officeName, created_by: userId, whatsapp: phone || null })
      .select("id")
      .single();

    if (companyErr) {
      console.error("Error creating company:", companyErr);
      return new Response(JSON.stringify({ error: "Erro ao criar empresa" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Link user to company
    await adminClient.from("client_companies").insert({ user_id: userId, company_id: company.id });

    // 5. Standard monitoring plan for all 3 tiers
    await adminClient.from("company_monitoring_plans").insert({
      company_id: company.id,
      plan_type: "professional",
      max_processes: STANDARD_MAX_PROCESSES,
      is_active: true,
    });

    // 6. Create Asaas customer
    const asaasBaseUrl = "https://api.asaas.com/v3";

    const customerRes = await fetch(`${asaasBaseUrl}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        name: full_name,
        email,
        phone: phone || undefined,
        cpfCnpj: cpf_cnpj.replace(/\D/g, ""),
        notificationDisabled: false,
      }),
    });

    if (!customerRes.ok) {
      const errBody = await customerRes.text();
      console.error("Asaas customer error:", errBody);
      await adminClient.from("subscriptions").insert({
        company_id: company.id,
        user_id: userId,
        plan,
        value: planConfig.chargedValue,
        status: "asaas_error",
      });
      return new Response(JSON.stringify({
        success: true,
        warning: "Conta criada, mas houve erro ao criar assinatura no Asaas. Entre em contato com o suporte.",
        user_id: userId,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customer = await customerRes.json();
    const asaasCustomerId = customer.id;

    // 7. Create Asaas charge — recurring subscription OR one-time payment
    const today = new Date();
    const nextDueDate = today.toISOString().split("T")[0];

    let asaasSubscriptionId: string | null = null;
    let asaasPaymentId: string | null = null;

    if (planConfig.billing === "recurring_monthly") {
      // Recurring monthly subscription (PIX or credit card via UNDEFINED billingType)
      const subscriptionRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "UNDEFINED", // lets customer pick PIX or credit card
          value: planConfig.chargedValue,
          nextDueDate,
          cycle: "MONTHLY",
          description: planConfig.description,
          maxPayments: 0,
        }),
      });

      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        asaasSubscriptionId = subData.id;
      } else {
        console.error("Asaas subscription error:", await subscriptionRes.text());
      }
    } else {
      // One-time payment (bimestral / anual)
      const paymentRes = await fetch(`${asaasBaseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "UNDEFINED",
          value: planConfig.chargedValue,
          dueDate: nextDueDate,
          description: planConfig.description,
        }),
      });

      if (paymentRes.ok) {
        const payData = await paymentRes.json();
        asaasPaymentId = payData.id;
      } else {
        console.error("Asaas payment error:", await paymentRes.text());
      }
    }

    const hasAsaasCharge = !!(asaasSubscriptionId || asaasPaymentId);

    // 8. Save subscription record
    await adminClient.from("subscriptions").insert({
      company_id: company.id,
      user_id: userId,
      plan,
      value: planConfig.chargedValue,
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: asaasSubscriptionId ?? asaasPaymentId,
      status: hasAsaasCharge ? "active" : "pending",
    });

    // 9. Update profile with phone
    if (phone) {
      await adminClient.from("profiles").update({ phone }).eq("user_id", userId);
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      company_id: company.id,
      plan,
      asaas_subscription_id: asaasSubscriptionId,
      asaas_payment_id: asaasPaymentId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Subscription error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
