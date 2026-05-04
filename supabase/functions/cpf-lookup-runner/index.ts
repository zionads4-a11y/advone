// Consulta processos no Escavador por CPF do envolvido (cliente final)
// Disparos: trigger automático ao definir CPF no lead, botão manual e cron semanal
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ESCAVADOR_BASE = "https://api.escavador.com/api/v2";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanCpf(cpf: string): string {
  return (cpf || "").replace(/\D/g, "");
}

async function escavadorGet(path: string) {
  const token = Deno.env.get("ESCAVADOR_API_TOKEN");
  if (!token) throw new Error("ESCAVADOR_API_TOKEN ausente");
  const res = await fetch(`${ESCAVADOR_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Escavador ${res.status}: ${txt}`);
  }
  return res.json();
}

// Consulta a API do Escavador por CPF
async function lookupByCpf(cpf: string) {
  const cleaned = cleanCpf(cpf);
  // V2: /envolvido/processos?cpf_cnpj=...
  const data = await escavadorGet(
    `/envolvido/processos?cpf_cnpj=${encodeURIComponent(cleaned)}&limit=50`,
  );
  const items = Array.isArray(data?.items) ? data.items : [];
  return { items, raw: data };
}

function buildSignature(items: any[]): string {
  // Assinatura estável: lista ordenada de "cnj|ultima_movimentacao"
  const parts = items
    .map((p: any) => `${p?.numero_cnj || ""}|${p?.data_ultima_movimentacao || ""}`)
    .sort();
  return parts.join(";");
}

async function processLookup(
  admin: any,
  payload: { lead_id: string; company_id: string; cpf: string; reason?: string },
) {
  const { lead_id, company_id, cpf, reason } = payload;
  const cleaned = cleanCpf(cpf);
  if (cleaned.length !== 11) {
    return { ok: false, error: "CPF inválido" };
  }

  let items: any[] = [];
  let raw: any = null;
  try {
    const r = await lookupByCpf(cleaned);
    items = r.items;
    raw = r.raw;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("lead_cpf_lookups").insert({
      company_id, lead_id, cpf: cleaned, source: "escavador",
      status: "error", error_message: msg, payload: {}, processes_count: 0, signature: "",
    });
    return { ok: false, error: msg };
  }

  const signature = buildSignature(items);

  // Última snapshot
  const { data: last } = await admin
    .from("lead_cpf_lookups")
    .select("id, signature, payload")
    .eq("lead_id", lead_id)
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isFirst = !last;
  const changed = last && last.signature !== signature;

  // Insere snapshot
  await admin.from("lead_cpf_lookups").insert({
    company_id, lead_id, cpf: cleaned, source: "escavador",
    status: "ok", payload: { items, reason }, processes_count: items.length, signature,
  });

  // Detecta novidades
  const alerts: any[] = [];
  if (isFirst && items.length > 0) {
    alerts.push({
      company_id, lead_id, cpf: cleaned,
      alert_type: "initial_processes_found",
      title: `${items.length} processo(s) encontrado(s) no CPF`,
      description: `Consulta inicial localizou ${items.length} processo(s) vinculados ao CPF ${cleaned}.`,
      payload: { items: items.slice(0, 10) },
    });
  } else if (changed) {
    const prevItems: any[] = (last?.payload as any)?.items || [];
    const prevCnjs = new Set(prevItems.map((p: any) => p?.numero_cnj));
    const newProcesses = items.filter((p: any) => p?.numero_cnj && !prevCnjs.has(p.numero_cnj));

    if (newProcesses.length > 0) {
      alerts.push({
        company_id, lead_id, cpf: cleaned,
        alert_type: "new_process",
        title: `${newProcesses.length} novo(s) processo(s) detectado(s)`,
        description: `Novos processos vinculados ao CPF: ${newProcesses.map((p: any) => p.numero_cnj).join(", ")}`,
        payload: { new_processes: newProcesses },
      });
    }

    const prevByCnj = new Map(prevItems.map((p: any) => [p?.numero_cnj, p]));
    const updatedProcesses = items.filter((p: any) => {
      const prev = prevByCnj.get(p?.numero_cnj);
      return prev && prev.data_ultima_movimentacao !== p.data_ultima_movimentacao;
    });
    if (updatedProcesses.length > 0) {
      alerts.push({
        company_id, lead_id, cpf: cleaned,
        alert_type: "process_movement",
        title: `${updatedProcesses.length} processo(s) com nova movimentação`,
        description: `Movimentação detectada em: ${updatedProcesses.map((p: any) => p.numero_cnj).join(", ")}`,
        payload: { updated_processes: updatedProcesses },
      });
    }
  }

  if (alerts.length > 0) {
    await admin.from("lead_cpf_alerts").insert(alerts);
  }

  return { ok: true, processes_count: items.length, changed: !!changed || isFirst, alerts: alerts.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "single";

    // Cron semanal: percorre todos os leads com CPF e refaz consulta
    if (mode === "cron") {
      const { data: leads } = await admin
        .from("leads")
        .select("id, company_id, cpf_cliente_final")
        .not("cpf_cliente_final", "is", null);

      const list = (leads || []).filter(
        (l: any) => cleanCpf(l.cpf_cliente_final).length === 11,
      );

      let ok = 0, fail = 0;
      for (const l of list) {
        try {
          await processLookup(admin, {
            lead_id: l.id,
            company_id: l.company_id,
            cpf: l.cpf_cliente_final,
            reason: "weekly_cron",
          });
          ok++;
          // Pequeno delay para não estourar rate limit
          await new Promise((r) => setTimeout(r, 250));
        } catch {
          fail++;
        }
      }
      return jsonResponse({ ok: true, processed: list.length, success: ok, failed: fail });
    }

    // Modo single (trigger automático ou botão manual)
    const body = await req.json().catch(() => ({}));
    const { lead_id, company_id, cpf, reason } = body || {};
    if (!lead_id || !company_id || !cpf) {
      return jsonResponse({ error: "lead_id, company_id e cpf são obrigatórios" }, 400);
    }
    const result = await processLookup(admin, { lead_id, company_id, cpf, reason });
    return jsonResponse(result, result.ok ? 200 : 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("cpf-lookup-runner error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
