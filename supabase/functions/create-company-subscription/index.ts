// Admin-only: cria customer + assinatura recorrente no Asaas para uma empresa e
// grava em public.subscriptions para o guard de bloqueio funcionar automaticamente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asaasApiKey = Deno.env.get("ASAAS_ADVONE_API_KEY");
    if (!asaasApiKey) return json({ error: "Asaas não configurado" }, 500);

    const admin = createClient(supabaseUrl, serviceKey);

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autorizado" }, 401);
    const token = auth.replace("Bearer ", "");
    const { data: claims, error: cErr } = await admin.auth.getClaims(token);
    if (cErr || !claims?.sub) return json({ error: "Token inválido" }, 401);
    const requesterId = claims.sub as string;

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: requesterId,
      _role: "admin",
    });
    const { data: isMember } = await admin.rpc("has_role", {
      _user_id: requesterId,
      _role: "member",
    });
    if (!isAdmin && !isMember) return json({ error: "Sem permissão" }, 403);

    const body = await req.json();
    const {
      company_id,
      user_id,           // usuário gerente que "possui" a assinatura (para o guard)
      plan,              // 'plan_ia' | 'plan_completo'
      value,             // valor mensal em R$
      due_day,           // 1..28
      billing_type,      // 'UNDEFINED' | 'PIX' | 'CREDIT_CARD' | 'BOLETO'
      customer_name,
      customer_email,
      customer_phone,
      customer_cpf_cnpj,
      description,
    } = body || {};

    // ---- validações
    if (!company_id) return json({ error: "company_id obrigatório" }, 400);
    if (!user_id) return json({ error: "user_id (gerente) obrigatório" }, 400);
    const PLAN_LABELS: Record<string, string> = {
      plan_ia: "AdvOne IA",
      plan_gestao: "AdvOne Gestão",
      plan_complete: "AdvOne Complete",
      plan_completo: "Plano Completo",
    };
    if (!PLAN_LABELS[plan])
      return json({ error: "plan inválido" }, 400);
    const valueNum = Number(value);
    if (!Number.isFinite(valueNum) || valueNum <= 0)
      return json({ error: "value inválido" }, 400);
    const dueDayNum = Number(due_day);
    if (!Number.isInteger(dueDayNum) || dueDayNum < 1 || dueDayNum > 28)
      return json({ error: "due_day deve ser entre 1 e 28" }, 400);
    const billing = String(billing_type || "UNDEFINED").toUpperCase();
    if (!["UNDEFINED", "PIX", "CREDIT_CARD", "BOLETO"].includes(billing))
      return json({ error: "billing_type inválido" }, 400);

    const cpfRaw = String(customer_cpf_cnpj || "").replace(/\D/g, "");
    if (cpfRaw.length !== 11 && cpfRaw.length !== 14)
      return json({ error: "CPF/CNPJ inválido" }, 400);
    const nameTrim = String(customer_name || "").trim();
    if (nameTrim.length < 2) return json({ error: "Nome do cliente obrigatório" }, 400);
    const phoneRaw = String(customer_phone || "").replace(/\D/g, "");

    // ---- confere que company existe
    const { data: company, error: compErr } = await admin
      .from("companies")
      .select("id, name")
      .eq("id", company_id)
      .maybeSingle();
    if (compErr || !company) return json({ error: "Empresa não encontrada" }, 404);

    // ---- calcula nextDueDate no próximo dia_de_vencimento
    const today = new Date();
    const yr = today.getFullYear();
    const mo = today.getMonth();
    const day = today.getDate();
    const target = new Date(yr, mo, dueDayNum);
    if (dueDayNum <= day) target.setMonth(mo + 1);
    const nextDueDate = target.toISOString().split("T")[0];

    const asaasBase = "https://api.asaas.com/v3";

    // ---- reusa customer se essa empresa já teve assinatura
    const { data: prevSub } = await admin
      .from("subscriptions")
      .select("asaas_customer_id")
      .eq("company_id", company_id)
      .not("asaas_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = prevSub?.asaas_customer_id as string | undefined;
    if (!customerId) {
      const cRes = await fetch(`${asaasBase}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: asaasApiKey },
        body: JSON.stringify({
          name: nameTrim,
          email: customer_email || undefined,
          phone: phoneRaw || undefined,
          mobilePhone: phoneRaw || undefined,
          cpfCnpj: cpfRaw,
          notificationDisabled: false,
          externalReference: `company_${company_id}`,
        }),
      });
      const cTxt = await cRes.text();
      if (!cRes.ok) {
        console.error("Asaas customer error:", cTxt);
        return json({ error: "Erro ao criar cliente Asaas: " + cTxt }, 500);
      }
      customerId = JSON.parse(cTxt).id;
    }

    // ---- cria subscription no Asaas
    const desc = description || `AdvOne — ${PLAN_LABELS[plan]} — ${company.name}`;
    const subRes = await fetch(`${asaasBase}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: asaasApiKey },
      body: JSON.stringify({
        customer: customerId,
        billingType: billing,
        value: valueNum,
        nextDueDate,
        cycle: "MONTHLY",
        description: desc,
        externalReference: `company_${company_id}`,
      }),
    });
    const subTxt = await subRes.text();
    if (!subRes.ok) {
      console.error("Asaas subscription error:", subTxt);
      return json({ error: "Erro ao criar assinatura Asaas: " + subTxt }, 500);
    }
    const asaasSub = JSON.parse(subTxt);

    // ---- tenta buscar o primeiro payment para pegar invoiceUrl (boleto/pix)
    let invoiceUrl: string | null = null;
    try {
      const pRes = await fetch(
        `${asaasBase}/payments?subscription=${asaasSub.id}&limit=1`,
        { headers: { access_token: asaasApiKey } },
      );
      if (pRes.ok) {
        const pj = await pRes.json();
        invoiceUrl = pj?.data?.[0]?.invoiceUrl ?? null;
      }
    } catch (_) { /* opcional */ }

    // ---- grava em public.subscriptions
    const { data: inserted, error: insErr } = await admin
      .from("subscriptions")
      .insert({
        user_id,
        company_id,
        plan,
        value: valueNum,
        status: "pending",
        asaas_customer_id: customerId,
        asaas_subscription_id: asaasSub.id,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("subscriptions insert error:", insErr);
      return json({ error: "Assinatura criada no Asaas mas falhou ao gravar local: " + insErr.message, asaas_subscription_id: asaasSub.id }, 500);
    }

    return json({
      ok: true,
      subscription_id: inserted.id,
      asaas_subscription_id: asaasSub.id,
      asaas_customer_id: customerId,
      next_due_date: nextDueDate,
      invoice_url: invoiceUrl,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || "Erro interno" }, 500);
  }
});
