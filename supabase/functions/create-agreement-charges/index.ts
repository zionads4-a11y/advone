// Cria cobranças Asaas (parcelado) para as parcelas do acordo
// e atualiza cada agreement_installment com asaas_payment_id + invoiceUrl
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body { agreement_id: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    if (!token) return json({ error: "missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "invalid auth" }, 401);

    const { agreement_id } = (await req.json()) as Body;
    if (!agreement_id) return json({ error: "agreement_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: agreement, error: agErr } = await admin
      .from("client_agreements")
      .select("*")
      .eq("id", agreement_id)
      .maybeSingle();
    if (agErr || !agreement) return json({ error: "agreement not found" }, 404);

    const { data: lead } = await admin
      .from("leads")
      .select("name, cpf_cliente_final, email, whatsapp, phone")
      .eq("id", agreement.lead_id)
      .maybeSingle();
    if (!lead) return json({ error: "client not found" }, 404);

    if (!lead.cpf_cliente_final) {
      return json({ error: "Cliente sem CPF cadastrado. Preencha o CPF antes de gerar as cobranças." }, 400);
    }

    const { data: cfg } = await admin
      .from("asaas_configs")
      .select("api_key, environment")
      .eq("company_id", agreement.company_id)
      .maybeSingle();
    if (!cfg?.api_key) return json({ error: "Asaas não configurado para esta empresa" }, 400);

    const baseUrl = cfg.environment === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

    // 1. Garante customer no Asaas
    const cpfClean = String(lead.cpf_cliente_final).replace(/\D/g, "");
    const phoneClean = String(lead.whatsapp || lead.phone || "").replace(/\D/g, "");

    let customerId: string | null = null;
    const existsResp = await fetch(`${baseUrl}/customers?cpfCnpj=${cpfClean}`, {
      headers: { access_token: cfg.api_key },
    });
    if (existsResp.ok) {
      const j = await existsResp.json();
      if (j?.data?.[0]?.id) customerId = j.data[0].id;
    }
    if (!customerId) {
      const createCustomer = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: cfg.api_key },
        body: JSON.stringify({
          name: lead.name,
          cpfCnpj: cpfClean,
          email: lead.email || undefined,
          mobilePhone: phoneClean || undefined,
        }),
      });
      const j = await createCustomer.json();
      if (!createCustomer.ok) return json({ error: "Falha ao criar cliente Asaas", details: j }, 400);
      customerId = j.id;
    }

    // 2. Para cada parcela pendente sem cobrança Asaas, cria cobrança avulsa
    const { data: installments } = await admin
      .from("agreement_installments")
      .select("*")
      .eq("agreement_id", agreement_id)
      .order("installment_number");

    const results: any[] = [];
    for (const inst of installments || []) {
      if (inst.asaas_payment_id || inst.status === "paid") continue;

      const payResp = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: cfg.api_key },
        body: JSON.stringify({
          customer: customerId,
          billingType: "BOLETO",
          value: Number(inst.amount),
          dueDate: inst.due_date,
          description: `${agreement.title} - Parcela ${inst.installment_number}/${agreement.installments_count}`,
          externalReference: inst.id,
        }),
      });
      const pay = await payResp.json();
      if (!payResp.ok) {
        results.push({ installment_id: inst.id, error: pay });
        continue;
      }
      await admin.from("agreement_installments").update({
        asaas_payment_id: pay.id,
        asaas_invoice_url: pay.invoiceUrl || pay.bankSlipUrl || null,
      }).eq("id", inst.id);
      results.push({ installment_id: inst.id, asaas_payment_id: pay.id, invoiceUrl: pay.invoiceUrl });
    }

    return json({ ok: true, count: results.length, results });
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
