// Reprocessa callbacks do Escavador que falharam.
// - Pega eventos com status='failed' e next_retry_at <= now()
// - Reprocessa o payload (a deduplicação por escavador_movement_id evita duplicar movimentos)
// - Atualiza o evento (success ou aumenta attempts e agenda próxima tentativa com backoff)
//
// Pode ser chamado:
//   - manualmente por um admin via supabase.functions.invoke('escavador-webhook-retry')
//   - por cron (pg_cron + pg_net) — agendado externamente
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { processEvent } from "../escavador-webhook/index.ts";

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
