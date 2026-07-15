// DataJud CNJ poller — consulta processos monitorados no DataJud e insere novas movimentações
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DATAJUD_API_KEY = Deno.env.get("DATAJUD_API_KEY")!;

// Mapeia código de tribunal do CNJ → alias DataJud
// CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO — J = segmento, TR = tribunal
const TJ_UF_BY_CODE: Record<string, string> = {
  "01": "ac","02":"al","03":"ap","04":"am","05":"ba","06":"ce","07":"df","08":"es",
  "09":"go","10":"ma","11":"mt","12":"ms","13":"mg","14":"pa","15":"pb","16":"pr",
  "17":"pe","18":"pi","19":"rj","20":"rn","21":"rs","22":"ro","23":"rr","24":"sc",
  "25":"sp","26":"se","27":"to"
};

function endpointFromCnj(cnj: string, siglaHint?: string | null): string | null {
  if (siglaHint) {
    const s = siglaHint.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (s) return `api_publica_${s}`;
  }
  const digits = cnj.replace(/\D/g, "");
  if (digits.length !== 20) return null;
  // pos: 0-6 num, 7-8 dv, 9-12 ano, 13 J, 14-15 TR
  const J = digits[13];
  const TR = digits.slice(14, 16);
  switch (J) {
    case "1": return "api_publica_stf";
    case "3": return "api_publica_stj";
    case "4": return `api_publica_trf${parseInt(TR, 10)}`;
    case "5":
      if (TR === "00") return "api_publica_tst";
      return `api_publica_trt${parseInt(TR, 10)}`;
    case "6":
      if (TR === "00") return "api_publica_tse";
      return `api_publica_tre-${TJ_UF_BY_CODE[TR] ?? TR}`;
    case "7": return "api_publica_stm";
    case "8": {
      const uf = TJ_UF_BY_CODE[TR];
      return uf ? `api_publica_tj${uf}` : null;
    }
    default: return null;
  }
}

async function queryDatajud(endpoint: string, numeroCnj: string) {
  const url = `https://api-publica.datajud.cnj.jus.br/${endpoint}/_search`;
  const body = {
    query: { match: { numeroProcesso: numeroCnj.replace(/\D/g, "") } },
    size: 1,
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `APIKey ${DATAJUD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`DataJud ${endpoint} ${resp.status}: ${txt.slice(0, 200)}`);
  }
  return await resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const stats = { total: 0, checked: 0, updated: 0, newMovements: 0, errors: 0, skipped: 0 };

  try {
    // Permitir chamada manual para 1 processo via body { monitored_process_id }
    let targetId: string | null = null;
    if (req.method === "POST") {
      try {
        const b = await req.json();
        targetId = b?.monitored_process_id ?? null;
      } catch { /* ignore */ }
    }

    let q = admin.from("monitored_processes")
      .select("id, company_id, numero_cnj, tribunal_sigla, quantidade_movimentacoes")
      .eq("is_active", true);
    if (targetId) q = q.eq("id", targetId);

    const { data: procs, error } = await q.limit(1000);
    if (error) throw error;
    stats.total = procs?.length ?? 0;

    for (const p of procs ?? []) {
      try {
        const endpoint = endpointFromCnj(p.numero_cnj, p.tribunal_sigla);
        if (!endpoint) { stats.skipped++; continue; }

        const data = await queryDatajud(endpoint, p.numero_cnj);
        stats.checked++;
        const hit = data?.hits?.hits?.[0]?._source;
        if (!hit) { stats.skipped++; continue; }

        const movimentos: any[] = Array.isArray(hit.movimentos) ? hit.movimentos : [];
        const orgao = hit.orgaoJulgador?.nome ?? null;
        const grau = hit.grau ? parseInt(String(hit.grau).replace(/\D/g, "")) || null : null;

        // Buscar já existentes p/ dedupe
        const { data: existing } = await admin
          .from("process_movements")
          .select("movement_date, content")
          .eq("monitored_process_id", p.id);
        const seen = new Set(
          (existing ?? []).map((m) => `${m.movement_date ?? ""}|${(m.content ?? "").slice(0, 200)}`)
        );

        const toInsert: any[] = [];
        for (const m of movimentos) {
          const nome = m?.nome ?? m?.movimentoNacional?.descricao ?? "Movimentação";
          const dt = m?.dataHora ? String(m.dataHora).slice(0, 10) : null;
          const key = `${dt ?? ""}|${nome.slice(0, 200)}`;
          if (seen.has(key)) continue;
          toInsert.push({
            monitored_process_id: p.id,
            company_id: p.company_id,
            movement_date: dt,
            movement_type: nome.slice(0, 120),
            content: nome,
            source_name: orgao,
            source_sigla: p.tribunal_sigla ?? null,
            source_grau: grau,
            is_new: true,
          });
        }

        if (toInsert.length) {
          const { error: insErr } = await admin.from("process_movements").insert(toInsert);
          if (insErr) throw insErr;
          stats.newMovements += toInsert.length;
        }

        await admin.from("monitored_processes").update({
          last_checked_at: new Date().toISOString(),
          quantidade_movimentacoes: movimentos.length,
          data_ultima_movimentacao: movimentos[0]?.dataHora ? String(movimentos[0].dataHora).slice(0, 10) : null,
          classe: hit.classe?.nome ?? null,
          assunto: Array.isArray(hit.assuntos) && hit.assuntos[0]?.nome ? hit.assuntos[0].nome : null,
        }).eq("id", p.id);
        stats.updated++;
      } catch (e) {
        console.error(`[datajud-poll] ${p.numero_cnj}:`, (e as Error).message);
        stats.errors++;
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[datajud-poll] fatal:", e);
    return new Response(JSON.stringify({ error: (e as Error).message, stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
