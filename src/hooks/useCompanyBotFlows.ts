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
  is_custom: boolean;
  case_type: string | null;
  description: string | null;
  /** Prompt customizado pela UI. Quando preenchido, substitui o bloco padrão do código. */
  custom_prompt_block: string | null;
}

/**
 * Garante que existe uma linha em company_bot_flows pra cada flow do catálogo,
 * pra empresa + niche. Retorna a lista combinada (do banco) ordenada por position.
 * Fluxos customizados (is_custom = true) são sempre carregados também.
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

    // Lista de flows que faltam ser semeados (apenas do catálogo padrão)
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
          is_custom: false,
          case_type: flow.case_type,
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
    // Fluxos customizados sempre aparecem para a empresa, independente do niche selecionado,
    // desde que a coluna niche bata com o nicho atual ou seja híbrido.
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
    async (flowId: string, patch: Partial<Pick<CompanyBotFlow, "label" | "icon_emoji" | "position" | "custom_intro" | "description" | "case_type" | "custom_prompt_block">>) => {
      setFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, ...patch } : f)));
      await supabase.from("company_bot_flows" as any).update(patch).eq("id", flowId);
    },
    []
  );

  /** Salva (ou limpa) o prompt customizado de um fluxo. Passar null volta a usar o padrão. */
  const updateFlowPrompt = useCallback(
    async (flowId: string, customPromptBlock: string | null) => {
      setFlows((prev) =>
        prev.map((f) =>
          f.id === flowId ? { ...f, custom_prompt_block: customPromptBlock } : f,
        ),
      );
      const { error } = await supabase
        .from("company_bot_flows" as any)
        .update({ custom_prompt_block: customPromptBlock })
        .eq("id", flowId);
      if (error) throw error;
    },
    [],
  );

  /**
   * Cria um fluxo personalizado (tese específica do escritório).
   * O flow_key recebe prefixo "custom_" + slug do label pra evitar colisão
   * com fluxos do catálogo padrão.
   */
  const createCustomFlow = useCallback(
    async (input: {
      label: string;
      description: string;
      niche: "previdenciario" | "trabalhista";
      icon_emoji?: string;
      case_type?: string;
    }) => {
      if (!companyId) return null;

      const slug = input.label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);

      const flow_key = `custom_${slug}_${Date.now().toString(36)}`;
      const case_type = input.case_type?.trim() || flow_key;
      const nextPosition = flows.length > 0 ? Math.max(...flows.map((f) => f.position)) + 1 : 0;

      const { data, error } = await supabase
        .from("company_bot_flows" as any)
        .insert({
          company_id: companyId,
          niche: input.niche,
          flow_key,
          label: input.label.trim(),
          icon_emoji: input.icon_emoji?.trim() || "✨",
          position: nextPosition,
          enabled: true,
          is_custom: true,
          case_type,
          description: input.description.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      await seedAndLoad();
      return data;
    },
    [companyId, flows, seedAndLoad]
  );

  const deleteFlow = useCallback(
    async (flowId: string) => {
      await supabase.from("company_bot_flows" as any).delete().eq("id", flowId);
      setFlows((prev) => prev.filter((f) => f.id !== flowId));
    },
    []
  );

  return { flows, loading, toggleFlow, updateFlow, updateFlowPrompt, createCustomFlow, deleteFlow, refetch: seedAndLoad };
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
