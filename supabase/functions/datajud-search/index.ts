// Busca manual: consulta um processo por CNJ no DataJud (todos os graus) e retorna dados + movimentações + decisões
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  fetchAllProcessDegrees,
  isDecisionMovement,
  movimentoTexto,
  normalizeCnj,
  type DatajudHit,
  type DatajudMovimento,
} from "../_shared/datajud.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("DATAJUD_API_KEY");
    if (!apiKey) throw new Error("DATAJUD_API_KEY não configurada");

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cnj, company_id, save = false, client_name } = await req.json();
    if (!cnj) throw new Error("cnj obrigatório");

    const { hits, alias } = await fetchAllProcessDegrees(cnj, apiKey);
    if (!hits.length) {
      return new Response(JSON.stringify({ ok: false, message: "Processo não encontrado no DataJud", alias }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Instância principal: menor grau (G1) — usada para os dados cadastrais
    const sortedHits = hits.slice().sort((a, b) => String(a.grau ?? "").localeCompare(String(b.grau ?? "")));
    const hit: DatajudHit = sortedHits[0];

    type Flat = DatajudMovimento & { grau?: string; orgao?: string };
    const flat: Flat[] = [];
    for (const h of hits) {
      for (const m of h.movimentos ?? []) {
        flat.push({ ...m, grau: h.grau, orgao: h.orgaoJulgador?.nome });
      }
    }

    // Dedupe por data+codigo+nome e ordena do mais recente para o mais antigo
    const seen = new Set<string>();
    const movimentos = flat
      .filter((m) => {
        const k = `${m.dataHora ?? ""}|${m.codigo ?? ""}|${m.nome ?? ""}|${m.grau ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => String(b.dataHora ?? "").localeCompare(String(a.dataHora ?? "")));

    const mapMov = (m: Flat) => ({
      data: m.dataHora,
      codigo: m.codigo,
      nome: m.nome,
      texto: movimentoTexto(m),
      grau: m.grau,
      orgao: m.orgao,
      is_decision: isDecisionMovement(m),
    });

    const movimentosOut = movimentos.map(mapMov);
    const decisoes = movimentosOut.filter((m) => m.is_decision);

    // Salva/atualiza monitored_process
    let monitored_id: string | null = null;
    if (save && company_id) {
      const numero_cnj = normalizeCnj(cnj);
      const upsertRow = {
        company_id,
        numero_cnj,
        client_name: client_name || hit.orgaoJulgador?.nome || "—",
        tribunal_sigla: hit.tribunal ?? alias?.toUpperCase() ?? null,
        classe: hit.classe?.nome ?? null,
        assunto: hit.assuntos?.[0]?.nome ?? null,
        data_inicio: hit.dataAjuizamento ? hit.dataAjuizamento.substring(0, 10) : null,
        data_ultima_movimentacao: movimentos[0]?.dataHora ? movimentos[0].dataHora!.substring(0, 10) : null,
        quantidade_movimentacoes: movimentos.length,
        last_checked_at: new Date().toISOString(),
        datajud_data: hit as unknown as Record<string, unknown>,
        datajud_tribunal_alias: alias,
        is_active: true,
      };
      const { data: mp, error: upErr } = await supabase
        .from("monitored_processes")
        .upsert(upsertRow, { onConflict: "company_id,numero_cnj" })
        .select("id")
        .single();
      if (upErr) throw upErr;
      monitored_id = mp.id;

      const { movementHash } = await import("../_shared/datajud.ts");
      const rows = await Promise.all(movimentos.map(async (m) => ({
        monitored_process_id: monitored_id!,
        company_id,
        movement_date: (m.dataHora ?? new Date().toISOString()).substring(0, 10),
        movement_type: m.nome ?? null,
        content: movimentoTexto(m),
        datajud_hash: await movementHash(m),
        source_provider: "datajud",
      })));
      if (rows.length) {
        await supabase.from("process_movements").upsert(rows, {
          onConflict: "monitored_process_id,datajud_hash",
          ignoreDuplicates: true,
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      alias,
      process: {
        numero_cnj: hit.numeroProcesso,
        classe: hit.classe?.nome,
        assunto: hit.assuntos?.[0]?.nome,
        tribunal: hit.tribunal,
        orgao: hit.orgaoJulgador?.nome,
        data_ajuizamento: hit.dataAjuizamento,
        grau: hit.grau,
      },
      graus: hits.map((h) => ({
        grau: h.grau,
        orgao: h.orgaoJulgador?.nome,
        movimentos: (h.movimentos ?? []).length,
      })),
      movimentos: movimentosOut,
      decisoes,
      monitored_id,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("datajud-search error", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
