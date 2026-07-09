// Modelos de cobrança disponíveis ao cadastrar uma empresa.
// Simplificado para 2 opções:
//   - plan_ia       → Só IA (menu enxuto): Dashboard, Kanban, Clientes, Agenda, Conversas, Monitoramento
//   - plan_completo → CRM completo (todos os módulos)
// A cobrança em si é lançada por fora (não pela plataforma).
//
// Chaves legadas (plan_ia_monthly, plan_ia_6m, plan_ia_12m, plan_zionads, plan_free)
// continuam válidas em tempo de execução para não quebrar empresas existentes,
// mas não aparecem mais na UI de cadastro/edição.

export type BillingModel =
  | "plan_ia"
  | "plan_completo"
  // legado — mantido apenas para compatibilidade de leitura
  | "plan_ia_monthly"
  | "plan_ia_6m"
  | "plan_ia_12m"
  | "plan_zionads"
  | "plan_free";

export interface BillingModelOption {
  key: BillingModel;
  label: string;
  emoji: string;
  description: string;
  partnership_type: "mensalidade_zionads";
  service_mode: "full" | "ai_only";
  monitoring_quota: number;
}

export const BILLING_MODELS: BillingModelOption[] = [
  {
    key: "plan_ia",
    emoji: "🤖",
    label: "Plano IA",
    description:
      "Acesso enxuto: Dashboard, Kanban, Clientes, Agenda, Conversas e Monitoramento de processos. Cobrança lançada por fora.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 10,
  },
  {
    key: "plan_completo",
    emoji: "🚀",
    label: "Plano Completo",
    description:
      "CRM completo com todos os módulos (IA Jurídica, Boards, Financeiro, Documentos, etc). Cobrança lançada por fora.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
  },
];

// Legado — usado apenas para exibir label/description de empresas antigas.
const LEGACY_BILLING_MODELS: BillingModelOption[] = [
  {
    key: "plan_ia_monthly",
    emoji: "🤖",
    label: "Plano IA Mensal (legado)",
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
  },
  {
    key: "plan_ia_6m",
    emoji: "🤖",
    label: "Plano IA 6 Meses (legado)",
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
  },
  {
    key: "plan_ia_12m",
    emoji: "🤖",
    label: "Plano IA 12 Meses (legado)",
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
  },
  {
    key: "plan_zionads",
    emoji: "🚀",
    label: "Plano ZionAds (legado)",
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 0,
  },
  {
    key: "plan_free",
    emoji: "🆓",
    label: "Acesso Livre (legado)",
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 0,
  },
];

export function getBillingModel(key: BillingModel): BillingModelOption {
  return (
    BILLING_MODELS.find((m) => m.key === key) ??
    LEGACY_BILLING_MODELS.find((m) => m.key === key) ??
    BILLING_MODELS[0]
  );
}

/** Deduz o billing_model a partir dos campos legados, para compatibilidade. */
export function inferBillingModel(
  _partnership_type?: string | null,
  service_mode?: string | null,
): BillingModel {
  return service_mode === "ai_only" ? "plan_ia" : "plan_completo";
}
