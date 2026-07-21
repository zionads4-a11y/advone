// Cron diário: varre monitored_processes ativos, consulta DataJud e insere novas movimentações
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  fetchProcessFromDatajud,
  movementHash,
  movimentoTexto,
} from "../_shared/datajud.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("DATAJUD_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "DATAJUD_API_KEY não configurada" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  const summary = { processed: 0, updated: 0, new_movements: 0, errors: 0, samples: [] as unknown[] };

  // Processa em lotes — pega os 200 processos há mais tempo sem checagem
  const { data: processes, error } = await supabase
    .from("monitored_processes")
    .select("id, company_id, numero_cnj, last_checked_at")
    .eq("is_active", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const p of processes ?? []) {
    summary.processed++;
    try {
      const { hit, alias } = await fetchProcessFromDatajud(p.numero_cnj, apiKey);
      if (!hit) {
        await supabase.from("monitored_processes")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("id", p.id);
        continue;
      }

      const movimentos = (hit.movimentos ?? []).slice().sort((a, b) => (b.dataHora ?? "").localeCompare(a.dataHora ?? ""));

      const rows = await Promise.all(movimentos.map(async (m) => ({
        monitored_process_id: p.id,
        company_id: p.company_id,
        movement_date: (m.dataHora ?? new Date().toISOString()).substring(0, 10),
        movement_type: m.nome ?? null,
        content: movimentoTexto(m),
        datajud_hash: await movementHash(m),
        source_provider: "datajud",
      })));

      let inserted = 0;
      if (rows.length) {
        const { data: ins, error: insErr } = await supabase
          .from("process_movements")
          .upsert(rows, { onConflict: "monitored_process_id,datajud_hash", ignoreDuplicates: true })
          .select("id");
        if (insErr) throw insErr;
        inserted = ins?.length ?? 0;
      }

      await supabase.from("monitored_processes").update({
        last_checked_at: new Date().toISOString(),
        quantidade_movimentacoes: movimentos.length,
        data_ultima_movimentacao: movimentos[0]?.dataHora?.substring(0, 10) ?? null,
        datajud_data: hit as unknown as Record<string, unknown>,
        datajud_tribunal_alias: alias,
        classe: hit.classe?.nome ?? null,
        assunto: hit.assuntos?.[0]?.nome ?? null,
      }).eq("id", p.id);

      summary.updated++;
      summary.new_movements += inserted;
    } catch (e) {
      summary.errors++;
      if (summary.samples.length < 5) summary.samples.push({ cnj: p.numero_cnj, error: String(e?.message ?? e) });
    }
    // pequena pausa para não estourar rate limit
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log("datajud-sync done", summary, "in", Date.now() - startedAt, "ms");
  return new Response(JSON.stringify({ ok: true, ...summary, elapsed_ms: Date.now() - startedAt }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
