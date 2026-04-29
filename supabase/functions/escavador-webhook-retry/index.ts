// Reprocessa callbacks do Escavador que falharam.
// - Pega eventos com status='failed' e next_retry_at <= now()
// - Reprocessa o payload (a deduplicação por escavador_movement_id evita duplicar movimentos)
// - Atualiza o evento (success ou aumenta attempts e agenda próxima tentativa com backoff)
//
// Pode ser chamado:
//   - manualmente por um admin via supabase.functions.invoke('escavador-webhook-retry')
//   - por cron (pg_cron + pg_net) — agendado externamente
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
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, message: msg }) }
    );
  } catch (e) {
    console.error("WhatsApp alert error:", e);
  }
}

async function processEvent(ev: any): Promise<{ inserted: number; error?: string }> {
  const sb = admin();
  const numeroCnj: string | undefined = ev?.numero_cnj || ev?.processo?.numero_cnj;
  const monitoramentoId: number | undefined = ev?.monitoramento_id || ev?.id_monitoramento;
  const movs: any[] = Array.isArray(ev?.movimentacoes) ? ev.movimentacoes : Array.isArray(ev?.itens) ? ev.itens : [];

  if (!numeroCnj && !monitoramentoId) return { inserted: 0, error: "missing numero_cnj and monitoramento_id" };

  let q = sb.from("monitored_processes").select("id, company_id, client_name, numero_cnj").eq("is_active", true);
  if (monitoramentoId) q = q.eq("escavador_monitoring_id", monitoramentoId);
  else q = q.eq("numero_cnj", numeroCnj!);

  const { data: procs, error: procErr } = await q;
  if (procErr) return { inserted: 0, error: `db: ${procErr.message}` };
  if (!procs?.length) return { inserted: 0, error: `process not found (cnj=${numeroCnj}, mon=${monitoramentoId})` };

  let totalInserted = 0;
  for (const proc of procs) {
    if (movs.length === 0) {
      await sb.from("monitored_processes").update({ last_checked_at: new Date().toISOString() }).eq("id", proc.id);
      continue;
    }
    const rows = movs
      .filter((m: any) => m && m.id !== undefined && m.id !== null)
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
      .update({ last_checked_at: new Date().toISOString(), data_ultima_movimentacao: rows[0]?.movement_date || null })
      .eq("id", proc.id);
    if (insertedCount > 0) {
      await sendWhatsappAlert(proc.company_id, proc.numero_cnj, proc.client_name, insertedCount);
    }
  }
  return { inserted: totalInserted };
}

const MAX_ATTEMPTS = 6; // ~ até ~ horas com backoff
function backoffMs(attempts: number) {
  // 5min, 15min, 1h, 3h, 6h, 12h
  const ladder = [5, 15, 60, 180, 360, 720];
  const min = ladder[Math.min(attempts, ladder.length - 1)] ?? 720;
  return min * 60_000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = admin();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);

  const { data: events, error } = await sb
    .from("escavador_webhook_events")
    .select("id, payload, attempts")
    .eq("status", "failed")
    .lte("next_retry_at", new Date().toISOString())
    .order("received_at", { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let succeeded = 0;
  let stillFailing = 0;
  let abandoned = 0;

  for (const ev of events || []) {
    const payload = ev.payload as any;
    const items: any[] = Array.isArray(payload?.eventos)
      ? payload.eventos
      : Array.isArray(payload) ? payload : [payload];

    let totalNew = 0;
    let anyError: string | undefined;
    for (const item of items) {
      const { inserted, error: itemErr } = await processEvent(item);
      totalNew += inserted;
      if (itemErr) anyError = (anyError ? anyError + " | " : "") + itemErr;
    }

    const newAttempts = (ev.attempts ?? 0) + 1;
    if (!anyError) {
      await sb.from("escavador_webhook_events").update({
        status: "success",
        attempts: newAttempts,
        movements_inserted: totalNew,
        last_error: null,
        processed_at: new Date().toISOString(),
        next_retry_at: null,
      }).eq("id", ev.id);
      succeeded++;
    } else if (newAttempts >= MAX_ATTEMPTS) {
      await sb.from("escavador_webhook_events").update({
        status: "invalid", // desiste
        attempts: newAttempts,
        last_error: `[abandoned after ${newAttempts} attempts] ${anyError}`,
        processed_at: new Date().toISOString(),
        next_retry_at: null,
      }).eq("id", ev.id);
      abandoned++;
    } else {
      await sb.from("escavador_webhook_events").update({
        status: "failed",
        attempts: newAttempts,
        last_error: anyError,
        processed_at: new Date().toISOString(),
        next_retry_at: new Date(Date.now() + backoffMs(newAttempts)).toISOString(),
      }).eq("id", ev.id);
      stillFailing++;
    }
  }

  console.log("[escavador-webhook-retry]", { tried: events?.length || 0, succeeded, stillFailing, abandoned });

  return new Response(
    JSON.stringify({ ok: true, tried: events?.length || 0, succeeded, stillFailing, abandoned }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
