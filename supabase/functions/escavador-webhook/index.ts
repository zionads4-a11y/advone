// Webhook público que recebe callbacks do Escavador V2 quando há novas
// movimentações nos processos monitorados.
// - Valida e normaliza o payload
// - Loga TODOS os eventos em escavador_webhook_events para auditoria/retry
// - Deduplicação automática via UNIQUE (monitored_process_id, escavador_movement_id)
// - Em caso de erro processando um item, marca o evento como `failed` para retry
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function sendWhatsappAlert(companyId: string, numeroCnj: string, clientName: string | null, count: number) {
  try {
    const sb = admin();
    const { data: cfg } = await sb
      .from("whatsapp_configs")
      .select("zapi_instance_id, zapi_token, alert_whatsapp")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!cfg?.alert_whatsapp || !cfg.zapi_instance_id) return;
    const phone = cfg.alert_whatsapp.replace(/\D/g, "");
    const msg =
      `⚖️ *Movimentação processual em tempo real*\n\n` +
      `📋 *Processo:* ${numeroCnj}\n` +
      (clientName ? `👤 *Cliente:* ${clientName}\n` : "") +
      `📌 *${count} nova(s) movimentação(ões)* detectada(s) pelo tribunal\n\n` +
      `Acesse o sistema para ver os detalhes.`;

    await fetch(
      `https://ziondigital.uazapi.com/instance/send-text/${cfg.zapi_instance_id}?token=${cfg.zapi_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: msg }),
      }
    );
  } catch (e) {
    console.error("WhatsApp alert error:", e);
  }
}

// Processa um único evento normalizado e retorna { inserted, error? }
export async function processEvent(ev: any): Promise<{ inserted: number; error?: string }> {
  const sb = admin();

  const numeroCnj: string | undefined = ev?.numero_cnj || ev?.processo?.numero_cnj;
  const monitoramentoId: number | undefined = ev?.monitoramento_id || ev?.id_monitoramento;
  const movs: any[] = Array.isArray(ev?.movimentacoes)
    ? ev.movimentacoes
    : Array.isArray(ev?.itens)
    ? ev.itens
    : [];

  if (!numeroCnj && !monitoramentoId) {
    return { inserted: 0, error: "missing numero_cnj and monitoramento_id" };
  }

  let q = sb.from("monitored_processes")
    .select("id, company_id, client_name, numero_cnj")
    .eq("is_active", true);
  if (monitoramentoId) q = q.eq("escavador_monitoring_id", monitoramentoId);
  else q = q.eq("numero_cnj", numeroCnj!);

  const { data: procs, error: procErr } = await q;
  if (procErr) return { inserted: 0, error: `db: ${procErr.message}` };
  if (!procs?.length) return { inserted: 0, error: `process not found (cnj=${numeroCnj}, mon=${monitoramentoId})` };

  let totalInserted = 0;

  for (const proc of procs) {
    if (movs.length === 0) {
      await sb.from("monitored_processes")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", proc.id);
      continue;
    }

    const rows = movs
      .filter((m: any) => m && (m.id !== undefined && m.id !== null))
      .map((m: any) => ({
        monitored_process_id: proc.id,
        company_id: proc.company_id,
        escavador_movement_id: m.id,
        movement_date: m.data || m.movement_date || null,
        movement_type: m.tipo || "ANDAMENTO",
        content: m.conteudo || m.content || null,
        source_name: m.fonte?.nome || null,
        source_sigla: m.fonte?.sigla || null,
        source_grau: m.fonte?.grau || null,
        is_new: true,
      }));

    if (rows.length === 0) continue;

    const { data: inserted, error: upErr } = await sb
      .from("process_movements")
      .upsert(rows, { onConflict: "monitored_process_id,escavador_movement_id", ignoreDuplicates: true })
      .select("id");

    if (upErr) return { inserted: totalInserted, error: `upsert: ${upErr.message}` };

    const insertedCount = inserted?.length || 0;
    totalInserted += insertedCount;

    await sb.from("monitored_processes")
      .update({
        last_checked_at: new Date().toISOString(),
        data_ultima_movimentacao: rows[0]?.movement_date || null,
      })
      .eq("id", proc.id);

    if (insertedCount > 0) {
      await sendWhatsappAlert(proc.company_id, proc.numero_cnj, proc.client_name, insertedCount);
    }
  }

  return { inserted: totalInserted };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = admin();
  let rawBody = "";
  let payload: any = {};

  try {
    rawBody = await req.text();
    try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch { payload = { _raw: rawBody }; }

    console.log("[escavador-webhook] received", {
      bytes: rawBody.length,
      keys: Object.keys(payload || {}),
    });

    // Validação básica do envelope
    if (!payload || typeof payload !== "object") {
      const { data: logged } = await sb.from("escavador_webhook_events").insert({
        payload: { _raw: rawBody },
        status: "invalid",
        last_error: "payload is not a JSON object",
        processed_at: new Date().toISOString(),
        attempts: 1,
      }).select("id").single();
      console.warn("[escavador-webhook] invalid payload", logged?.id);
      return new Response(JSON.stringify({ ok: false, reason: "invalid payload" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normaliza eventos
    const items: any[] = Array.isArray(payload?.eventos)
      ? payload.eventos
      : Array.isArray(payload) ? payload : [payload];

    let totalNew = 0;
    let anyError: string | undefined;
    const cnjs = new Set<string>();
    const monIds = new Set<number>();

    for (const ev of items) {
      if (ev?.numero_cnj) cnjs.add(String(ev.numero_cnj));
      if (ev?.monitoramento_id) monIds.add(Number(ev.monitoramento_id));

      const { inserted, error } = await processEvent(ev);
      totalNew += inserted;
      if (error) anyError = (anyError ? anyError + " | " : "") + error;
    }

    const status = anyError ? "failed" : "success";
    const nextRetry = anyError ? new Date(Date.now() + 5 * 60_000).toISOString() : null;

    await sb.from("escavador_webhook_events").insert({
      payload,
      status,
      numero_cnj: cnjs.size === 1 ? Array.from(cnjs)[0] : null,
      monitoramento_id: monIds.size === 1 ? Array.from(monIds)[0] : null,
      movements_inserted: totalNew,
      last_error: anyError || null,
      processed_at: new Date().toISOString(),
      next_retry_at: nextRetry,
      attempts: 1,
    });

    console.log("[escavador-webhook] processed", { inserted: totalNew, status, error: anyError });

    return new Response(JSON.stringify({ ok: true, processed: totalNew, status, error: anyError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[escavador-webhook] fatal", errMsg);
    try {
      await sb.from("escavador_webhook_events").insert({
        payload: payload || { _raw: rawBody },
        status: "failed",
        last_error: errMsg,
        processed_at: new Date().toISOString(),
        attempts: 1,
        next_retry_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
    } catch (logErr) {
      console.error("[escavador-webhook] failed to log fatal", logErr);
    }
    // 200 para evitar loop de retentativa do Escavador; nosso retry interno cuida
    return new Response(JSON.stringify({ ok: false, error: errMsg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
