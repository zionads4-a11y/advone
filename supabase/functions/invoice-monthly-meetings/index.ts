// Consolida cobranças de reuniões realizadas (R$ 97 cada) por empresa
// e gera 1 pagamento Asaas único por empresa para o mês informado.
//
// Body: { month?: string ('YYYY-MM', default = mês anterior), company_id?: string }
//
// Para cada empresa com cobranças "pending" do mês:
//   1. soma o total
//   2. cria/garante o customer no Asaas
//   3. cria 1 payment (BOLETO+PIX) com vencimento no dia 10 do mês seguinte
//   4. marca todas as meeting_charges como status='invoiced' com asaas_payment_id

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_ADVONE_API_KEY")!;
const ASAAS_BASE = "https://api.asaas.com/v3";

interface AsaasCustomer { id: string; name: string; }
interface AsaasPayment { id: string; invoiceUrl: string; }

async function asaas<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "access_token": ASAAS_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Asaas ${res.status}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

function previousMonth(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dueDate(month: string): string {
  // dia 10 do mês seguinte ao mês de competência
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 10)); // m já é o próximo mês (0-indexed +1 cancela)
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const month: string = body.month || previousMonth();
    const onlyCompany: string | undefined = body.company_id;

    console.log(`[invoice-meetings] Consolidando mês=${month}${onlyCompany ? ` empresa=${onlyCompany}` : ""}`);

    // Carrega cobranças pendentes do mês
    let q = admin
      .from("meeting_charges")
      .select("id, company_id, amount")
      .eq("invoice_month", month)
      .eq("status", "pending");
    if (onlyCompany) q = q.eq("company_id", onlyCompany);
    const { data: pending, error: errLoad } = await q;
    if (errLoad) throw errLoad;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "Nenhuma cobrança pendente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Agrupa por empresa
    const byCompany: Record<string, { ids: string[]; total: number }> = {};
    for (const r of pending) {
      const k = r.company_id;
      if (!byCompany[k]) byCompany[k] = { ids: [], total: 0 };
      byCompany[k].ids.push(r.id);
      byCompany[k].total += Number(r.amount);
    }

    const results: Array<Record<string, unknown>> = [];

    for (const [companyId, info] of Object.entries(byCompany)) {
      try {
        // Pega dados da empresa
        const { data: company } = await admin
          .from("companies")
          .select("id, name, whatsapp")
          .eq("id", companyId)
          .maybeSingle();
        if (!company) {
          results.push({ company_id: companyId, ok: false, error: "company not found" });
          continue;
        }

        // Cria customer no Asaas (busca por nome/celular ou cria novo)
        const cleanPhone = (company.whatsapp || "").replace(/\D/g, "");
        let customerId: string | null = null;

        if (cleanPhone) {
          const search = await asaas<{ data: AsaasCustomer[] }>(
            `/customers?mobilePhone=${cleanPhone}`
          );
          if (search.data && search.data.length > 0) customerId = search.data[0].id;
        }
        if (!customerId) {
          const created = await asaas<AsaasCustomer>(`/customers`, {
            method: "POST",
            body: JSON.stringify({
              name: company.name,
              mobilePhone: cleanPhone || undefined,
            }),
          });
          customerId = created.id;
        }

        // Cria pagamento consolidado
        const payment = await asaas<AsaasPayment>(`/payments`, {
          method: "POST",
          body: JSON.stringify({
            customer: customerId,
            billingType: "UNDEFINED", // permite Pix/boleto/cartão
            value: info.total,
            dueDate: dueDate(month),
            description: `Faturamento AdvOne — ${info.ids.length} reunião(ões) realizada(s) em ${month}`,
            externalReference: `meetings:${companyId}:${month}`,
          }),
        });

        // Atualiza meeting_charges
        await admin
          .from("meeting_charges")
          .update({
            status: "invoiced",
            asaas_payment_id: payment.id,
            asaas_invoice_url: payment.invoiceUrl,
            invoiced_at: new Date().toISOString(),
          })
          .in("id", info.ids);

        results.push({
          company_id: companyId,
          company_name: company.name,
          ok: true,
          count: info.ids.length,
          total: info.total,
          payment_id: payment.id,
          invoice_url: payment.invoiceUrl,
        });
      } catch (err) {
        console.error(`Erro empresa ${companyId}:`, err);
        results.push({ company_id: companyId, ok: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, month, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[invoice-meetings] erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
