// Decision Engine — AdvOne
// Recebe { lead_id?, company_id, niche, case_type, answers }
// Retorna { score, classification, action, priority, reason, matched_rule_id }
// Se lead_id presente: persiste em lead_qualification_answers, atualiza leads.lead_score
// e move o card no Kanban conforme a action.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Condition = { field: string; op: string; value: any };
type Rule = {
  id: string;
  company_id: string | null;
  niche: string;
  case_type: string | null;
  rule_name: string;
  priority: number;
  conditions: Condition[];
  output: {
    score: number;
    classification: "quente" | "morno" | "frio" | "invalido";
    action: "agendar" | "continuar_qualificacao" | "pedir_documentos" | "transferir_humano" | "encerrar";
    priority: "alta" | "media" | "baixa";
    reason: string;
  };
};

function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function evalCondition(input: any, c: Condition): boolean {
  const v = getByPath(input, c.field);
  switch (c.op) {
    case "eq": return v === c.value;
    case "neq": return v !== c.value;
    case "in": return Array.isArray(c.value) && c.value.includes(v);
    case "not_in": return Array.isArray(c.value) && !c.value.includes(v);
    case "gt": return typeof v === "number" && v > c.value;
    case "gte": return typeof v === "number" && v >= c.value;
    case "lt": return typeof v === "number" && v < c.value;
    case "lte": return typeof v === "number" && v <= c.value;
    case "exists": return v !== undefined && v !== null && v !== "";
    default: return false;
  }
}

function ruleMatches(input: any, rule: Rule): boolean {
  if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) return true; // fallback rules
  return rule.conditions.every((c) => evalCondition(input, c));
}

async function loadApplicableRules(
  supabase: any,
  companyId: string,
  niche: string,
  caseType: string | null,
): Promise<Rule[]> {
  // Override hierarchy: rules of the company override globals when matching same (niche, case_type, rule_name).
  const { data: overrides } = await supabase
    .from("decision_rules")
    .select("*")
    .eq("company_id", companyId)
    .eq("niche", niche)
    .eq("is_active", true);

  const { data: globals } = await supabase
    .from("decision_rules")
    .select("*")
    .is("company_id", null)
    .eq("niche", niche)
    .eq("is_active", true);

  const overrideKeys = new Set((overrides || []).map((r: Rule) => r.rule_name));
  const merged = [
    ...(overrides || []),
    ...((globals || []) as Rule[]).filter((r) => !overrideKeys.has(r.rule_name)),
  ] as Rule[];

  // Filter case_type: rule.case_type NULL means "applies to any case in the niche"
  const filtered = merged.filter((r) => !r.case_type || r.case_type === caseType);

  // Sort by priority asc (lower first), then specific case_type before generic
  filtered.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aSpec = a.case_type ? 0 : 1;
    const bSpec = b.case_type ? 0 : 1;
    return aSpec - bSpec;
  });

  return filtered;
}

function applyFinalGuards(input: any, decision: Rule["output"]): Rule["output"] {
  // Bloco de controle final: agendar exige classification=quente AND wants_help=sim
  if (decision.action === "agendar") {
    const wantsHelp = getByPath(input, "answers.wants_help");
    if (decision.classification !== "quente" || (wantsHelp !== undefined && wantsHelp !== "sim")) {
      return {
        ...decision,
        action: "continuar_qualificacao",
        reason: `${decision.reason} — agendamento bloqueado pelo controle final (classification!=quente ou wants_help!=sim)`,
      };
    }
  }
  return decision;
}

async function applyKanbanMove(supabase: any, leadId: string, companyId: string, action: string) {
  // Mapeia action → coluna do Kanban
  const targetMap: Record<string, { name?: string; flag?: "is_won" | "is_lost" }> = {
    agendar: { name: "Agendado" },
    encerrar: { flag: "is_lost" },
    continuar_qualificacao: { name: "1º Follow-UP" },
    pedir_documentos: { name: "1º Follow-UP" },
  };
  const target = targetMap[action];
  if (!target) return;

  let query = supabase.from("kanban_columns").select("id").eq("company_id", companyId).limit(1);
  if (target.name) query = query.ilike("name", target.name);
  if (target.flag === "is_lost") query = query.eq("is_lost", true);
  if (target.flag === "is_won") query = query.eq("is_won", true);

  const { data: col } = await query.maybeSingle();
  if (col?.id) {
    await supabase.from("leads").update({ kanban_column_id: col.id }).eq("id", leadId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { lead_id, company_id, niche, case_type, answers, dry_run } = body || {};

    if (!company_id || !niche || !answers || typeof answers !== "object") {
      return new Response(
        JSON.stringify({ error: "company_id, niche e answers são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const rules = await loadApplicableRules(admin, company_id, niche, case_type ?? null);

    const input = { niche, case_type, answers };
    let matched: Rule | null = null;
    for (const r of rules) {
      if (ruleMatches(input, r)) { matched = r; break; }
    }

    let decision: Rule["output"];
    let matchedRuleId: string | null = null;

    if (matched) {
      decision = applyFinalGuards(input, matched.output);
      matchedRuleId = matched.id;
    } else {
      // Sem nenhuma regra aplicável — fallback universal seguro
      decision = {
        score: 50,
        classification: "morno",
        action: "continuar_qualificacao",
        priority: "media",
        reason: "Nenhuma regra correspondeu — manter qualificação",
      };
    }

    const result = { ...decision, matched_rule_id: matchedRuleId };

    // Persistência opcional (só se vier lead_id e não for dry_run)
    if (lead_id && !dry_run) {
      await admin.from("lead_qualification_answers").insert({
        lead_id,
        company_id,
        niche,
        case_type: case_type ?? null,
        answers,
        decision_result: result,
        decided_at: new Date().toISOString(),
      });

      const scoreMap: Record<string, string> = {
        quente: "quente", morno: "morno", frio: "frio", invalido: "frio",
      };
      await admin.from("leads")
        .update({ lead_score: scoreMap[decision.classification] || "morno" })
        .eq("id", lead_id);

      await applyKanbanMove(admin, lead_id, company_id, decision.action);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("decision-engine error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
