// Modelos de cobrança disponíveis ao cadastrar uma empresa.
// Cada modelo define automaticamente:
//   - partnership_type (sempre "mensalidade_zionads")
//   - service_mode    (full = CRM completo / ai_only = só IA Laura)

export type BillingModel = "plan_completo" | "plan_ia_monthly" | "plan_ia_6m" | "plan_ia_12m" | "plan_cortesia";

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
    key: "plan_completo",
    emoji: "🚀",
    label: "Plano Completo (R$ 897/mês)",
    description: "Tudo do Admin + Bot SDR (Laura), IA Jurídica Claude, Alertas de Fraude, Boards. 50 monitoramentos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 50,
  },
  {
    key: "plan_ia_monthly",
    emoji: "🤖",
    label: "Plano IA Mensal (R$ 797/mês)",
    description: "IA Laura, IA Jurídica, Boards e Agenda. Sem fidelidade. 30 monitoramentos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 30,
  },
  {
    key: "plan_ia_6m",
    emoji: "🤖",
    label: "Plano IA 6 Meses (R$ 497/mês)",
    description: "IA Laura, IA Jurídica, Boards e Agenda. Fidelidade de 6 meses. 30 monitoramentos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 30,
  },
  {
    key: "plan_ia_12m",
    emoji: "🤖",
    label: "Plano IA 12 Meses (R$ 297/mês)",
    description: "IA Laura, IA Jurídica, Boards e Agenda. Fidelidade de 12 meses. 30 monitoramentos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 30,
  },
  {
    key: "plan_cortesia",
    emoji: "🎁",
    label: "Plano Cortesia ZionAds",
    description: "Acesso à IA Laura, IA Jurídica, Boards e Agenda. Monitoramento de processos cobrado à parte (R$ 2,50/mês cada).",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 0,
  },
];

export function getBillingModel(key: BillingModel): BillingModelOption {
  return BILLING_MODELS.find((m) => m.key === key) ?? BILLING_MODELS[0];
}

/** Deduz o billing_model a partir dos campos legados, para compatibilidade. */
export function inferBillingModel(
  _partnership_type?: string | null,
  service_mode?: string | null,
): BillingModel {
  return "plan_cortesia";
}

