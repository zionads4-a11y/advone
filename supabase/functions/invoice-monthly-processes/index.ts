// Cobrança mensal de monitoramento de processos
// R$ 2,50 × processos ativos por empresa, consolidado em 1 cobrança Asaas/mês.
//
// Body: { month?: string ('YYYY-MM', default = mês atual), company_id?: string }
//
// Para cada empresa com processos ativos:
//   1. conta processos ativos
//   2. calcula total = 2.50 × count
//   3. cria/garante customer no Asaas
//   4. cria 1 payment com vencimento dia 10 do mês seguinte
//   5. registra em process_monitoring_charges (idempotente por company_id+month)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_ADVONE_API_KEY")!;
const ASAAS_BASE = "https://api.asaas.com/v3";
const PRICE_PER_PROCESS = 2.50;

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

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dueDate(month: string): string {
  // dia 10 do mês seguinte
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 10));
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const month: string = body.month || currentMonth();
    const onlyCompany: string | undefined = body.company_id;
    const triggeredBy: string = body.triggered_by || (req.headers.get("x-trigger-source") ?? "manual");
    const runId: string = crypto.randomUUID();

    console.log(`[invoice-processes] run=${runId} mês=${month}${onlyCompany ? ` empresa=${onlyCompany}` : ""} trigger=${triggeredBy}`);

    // Log de início da execução
    await admin.from("process_billing_audit_logs").insert({
      run_id: runId,
      invoice_month: month,
      status: "run_started",
      triggered_by: triggeredBy,
      details: { only_company: onlyCompany ?? null },
    });

    // Conta processos ativos por empresa
    let q = admin
      .from("monitored_processes")
      .select("company_id")
      .eq("is_active", true);
    if (onlyCompany) q = q.eq("company_id", onlyCompany);
    const { data: rows, error } = await q;
    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "Nenhum processo ativo" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.company_id] = (counts[r.company_id] || 0) + 1;

    const results: Array<Record<string, unknown>> = [];

    for (const [companyId, count] of Object.entries(counts)) {
      try {
        // Idempotência: já cobrou esta empresa neste mês?
        const { data: existing } = await admin
          .from("process_monitoring_charges")
          .select("id")
          .eq("company_id", companyId)
          .eq("invoice_month", month)
          .maybeSingle();
        if (existing) {
          console.log(`[invoice-processes] skip company=${companyId} mês=${month} (já cobrado)`);
          await admin.from("process_billing_audit_logs").insert({
            run_id: runId,
            company_id: companyId,
            invoice_month: month,
            total_processes: count,
            status: "skipped_duplicate",
            triggered_by: triggeredBy,
            details: { reason: "charge already exists for company+month" },
          });
          results.push({ company_id: companyId, ok: true, skipped: "já cobrado" });
          continue;
        }

        const { data: company } = await admin
          .from("companies")
          .select("id, name, whatsapp, billing_model, custom_base_value, office_legal_name, office_cnpj, office_address")
          .eq("id", companyId)
          .maybeSingle();
        if (!company) {
          await admin.from("process_billing_audit_logs").insert({
            run_id: runId,
            company_id: companyId,
            invoice_month: month,
            total_processes: count,
            status: "failed",
            error_message: "company not found",
            triggered_by: triggeredBy,
          });
          results.push({ company_id: companyId, ok: false, error: "company not found" });
          continue;
        }

        // Quota mensal incluída por plano (acima disso é cobrado por processo)
        const quotaByPlan: Record<string, number> = {
          plan_ia: 10,
          plan_completo: 10,
          // legado
          plan_ia_monthly: 10,
          plan_ia_6m: 10,
          plan_ia_12m: 10,
          plan_zionads: 0,
        };
        const quota = quotaByPlan[company.billing_model as string] ?? 0;
        const excess = Math.max(0, count - quota);
        const customBase = Number(company.custom_base_value || 0);
        const total = +(excess * PRICE_PER_PROCESS + customBase).toFixed(2);

        if (total <= 0) {
          console.log(`[invoice-processes] skip company=${companyId} (total zero: excesso=${excess}, base=${customBase})`);
          results.push({ company_id: companyId, ok: true, skipped: "quota não excedida" });
          continue;
        }
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
              name: company.office_legal_name || company.name,
              cpfCnpj: company.office_cnpj ? company.office_cnpj.replace(/\D/g, "") : undefined,
              mobilePhone: cleanPhone || undefined,
              address: company.office_address || undefined,
            }),
          });
          customerId = created.id;
        }

        const payment = await asaas<AsaasPayment>(`/payments`, {
          method: "POST",
          body: JSON.stringify({
            customer: customerId,
            billingType: "UNDEFINED",
            value: total,
            dueDate: dueDate(month),
            description: company.billing_model === 'plan_zionads' 
              ? `Fatura Mensal AdvOne — ${month} (Monitoramento: ${count} proc., Base/Tráfego: R$ ${customBase.toFixed(2).replace(".", ",")})`
              : `Monitoramento de processos AdvOne — ${count} processo(s) ativo(s) em ${month} (R$ ${PRICE_PER_PROCESS.toFixed(2).replace(".", ",")} cada)`,
            externalReference: `processes:${companyId}:${month}`,
          }),
        });

        await admin.from("process_monitoring_charges").insert({
          company_id: companyId,
          invoice_month: month,
          process_count: count,
          unit_price: PRICE_PER_PROCESS,
          total_amount: total,
          asaas_payment_id: payment.id,
          asaas_invoice_url: payment.invoiceUrl,
          status: "invoiced",
        });

        console.log(`[invoice-processes] OK company=${companyId} (${company.name}) processos=${count} total=R$${total} payment=${payment.id}`);
        await admin.from("process_billing_audit_logs").insert({
          run_id: runId,
          company_id: companyId,
          invoice_month: month,
          total_processes: count,
          total_amount: total,
          status: "invoiced",
          asaas_payment_id: payment.id,
          triggered_by: triggeredBy,
          details: {
            company_name: company.name,
            unit_price: PRICE_PER_PROCESS,
            due_date: dueDate(month),
            invoice_url: payment.invoiceUrl,
            asaas_customer_id: customerId,
          },
        });

        results.push({
          company_id: companyId,
          company_name: company.name,
          ok: true,
          count,
          total,
          payment_id: payment.id,
          invoice_url: payment.invoiceUrl,
        });
      } catch (err) {
        console.error(`[invoice-processes] erro company=${companyId}:`, err);
        await admin.from("process_billing_audit_logs").insert({
          run_id: runId,
          company_id: companyId,
          invoice_month: month,
          total_processes: count,
          status: "failed",
          error_message: String(err),
          triggered_by: triggeredBy,
        });
        results.push({ company_id: companyId, ok: false, error: String(err) });
      }
    }

    const summary = {
      total_companies: results.length,
      invoiced: results.filter((r) => r.ok && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.ok).length,
    };

    await admin.from("process_billing_audit_logs").insert({
      run_id: runId,
      invoice_month: month,
      status: "run_completed",
      triggered_by: triggeredBy,
      details: summary,
    });

    console.log(`[invoice-processes] run=${runId} concluído:`, summary);

    return new Response(JSON.stringify({ ok: true, run_id: runId, month, summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[invoice-processes] erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
