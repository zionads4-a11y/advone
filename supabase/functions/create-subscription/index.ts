import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_CONFIG: Record<string, { value: number; maxProcesses: number; planType: string }> = {
  essencial: { value: 297, maxProcesses: 0, planType: "essencial" },
  profissional: { value: 497, maxProcesses: 50, planType: "profissional" },
  elite: { value: 697, maxProcesses: 100, planType: "elite" },
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

    // 5. Create monitoring plan if applicable
    if (planConfig.maxProcesses > 0) {
      await adminClient.from("company_monitoring_plans").insert({
        company_id: company.id,
        plan_type: planConfig.planType,
        max_processes: planConfig.maxProcesses,
        is_active: true,
      });
    }

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
      // Save subscription without Asaas IDs for manual retry
      await adminClient.from("subscriptions").insert({
        company_id: company.id,
        user_id: userId,
        plan,
        value: planConfig.value,
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

    // 7. Create Asaas subscription
    const today = new Date();
    const nextDueDate = today.toISOString().split("T")[0];

    const subscriptionRes = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": asaasApiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: planConfig.value,
        nextDueDate,
        cycle: "MONTHLY",
        description: `AdvOne - Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
        maxPayments: 0,
      }),
    });

    let asaasSubscriptionId = null;
    if (subscriptionRes.ok) {
      const subData = await subscriptionRes.json();
      asaasSubscriptionId = subData.id;
    } else {
      console.error("Asaas subscription error:", await subscriptionRes.text());
    }

    // 8. Save subscription record
    await adminClient.from("subscriptions").insert({
      company_id: company.id,
      user_id: userId,
      plan,
      value: planConfig.value,
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: asaasSubscriptionId,
      status: asaasSubscriptionId ? "active" : "pending",
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
