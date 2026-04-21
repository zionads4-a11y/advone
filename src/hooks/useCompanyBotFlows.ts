import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getFlowCatalog,
  type Niche,
} from "@/components/companies/botFlowsCatalog";

export interface CompanyBotFlow {
  id: string;
  company_id: string;
  niche: string;
  flow_key: string;
  label: string;
  icon_emoji: string;
  position: number;
  enabled: boolean;
  custom_intro: string | null;
}

/**
 * Garante que existe uma linha em company_bot_flows pra cada flow do catálogo,
 * pra empresa + niche. Retorna a lista combinada (do banco) ordenada por position.
 */
export function useCompanyBotFlows(companyId: string | null, niche: Niche) {
  const [flows, setFlows] = useState<CompanyBotFlow[]>([]);
  const [loading, setLoading] = useState(true);

  const seedAndLoad = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const catalog = getFlowCatalog(niche);

    // Busca o que já existe
    const { data: existing } = await supabase
      .from("company_bot_flows" as any)
      .select("*")
      .eq("company_id", companyId);

    const existingMap = new Map<string, any>(
      (existing || []).map((f: any) => [`${f.niche}:${f.flow_key}`, f])
    );

    // Lista de flows que faltam ser semeados
    const toInsert: any[] = [];
    catalog.forEach((flow, idx) => {
      const flowNiche = niche === "hibrido"
        ? (flow.flow_key in PREV_KEYS ? "previdenciario" : "trabalhista")
        : niche;
      const key = `${flowNiche}:${flow.flow_key}`;
      if (!existingMap.has(key)) {
        toInsert.push({
          company_id: companyId,
          niche: flowNiche,
          flow_key: flow.flow_key,
          label: flow.label,
          icon_emoji: flow.icon_emoji,
          position: idx,
          enabled: flow.default_enabled ?? true,
        });
      }
    });

    if (toInsert.length > 0) {
      await supabase.from("company_bot_flows" as any).insert(toInsert);
    }

    // Recarrega tudo
    const { data: final } = await supabase
      .from("company_bot_flows" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("position");

    // Filtra pelo niche atual (se híbrido, mostra os dois)
    const filtered = ((final || []) as unknown as CompanyBotFlow[]).filter((f) => {
      if (niche === "hibrido") return true;
      return f.niche === niche;
    });

    setFlows(filtered);
    setLoading(false);
  }, [companyId, niche]);

  useEffect(() => {
    seedAndLoad();
  }, [seedAndLoad]);

  const toggleFlow = useCallback(async (flowId: string, enabled: boolean) => {
    setFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, enabled } : f)));
    await supabase
      .from("company_bot_flows" as any)
      .update({ enabled })
      .eq("id", flowId);
  }, []);

  const updateFlow = useCallback(
    async (flowId: string, patch: Partial<Pick<CompanyBotFlow, "label" | "icon_emoji" | "position" | "custom_intro">>) => {
      setFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, ...patch } : f)));
      await supabase.from("company_bot_flows" as any).update(patch).eq("id", flowId);
    },
    []
  );

  return { flows, loading, toggleFlow, updateFlow, refetch: seedAndLoad };
}

// Conjunto de keys previdenciárias (pra desambiguar no modo híbrido)
const PREV_KEYS: Record<string, true> = {
  aposentadoria: true,
  beneficio_negado: true,
  revisao_aposentadoria: true,
  bpc_loas: true,
  auxilio_invalidez: true,
  rmc_rcc: true,
  demora_inss: true,
  salario_maternidade: true,
};
