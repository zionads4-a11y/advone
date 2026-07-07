// Modelos de cobrança disponíveis ao cadastrar uma empresa.
// Cada modelo define automaticamente:
//   - partnership_type (sempre "mensalidade_zionads")
//   - service_mode    (full = CRM completo / ai_only = só IA Laura)

export type BillingModel = "plan_completo" | "plan_ia_monthly" | "plan_ia_6m" | "plan_ia_12m" | "plan_zionads" | "plan_free";

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
    label: "Plano Completo (R$ 997/mês)",
    description: "Tudo do Admin + Bot SDR (Laura), IA Jurídica Claude, Alertas de Fraude, Boards. 50 monitoramentos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 50,
  },
  {
    key: "plan_ia_monthly",
    emoji: "🤖",
    label: "Plano IA Mensal (R$ 697/mês)",
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
    label: "Plano IA 12 Meses (R$ 299/mês)",
    description: "IA Laura, IA Jurídica, Boards e Agenda. Fidelidade de 12 meses. 30 monitoramentos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 30,
  },
  {
    key: "plan_zionads",
    emoji: "🚀",
    label: "Plano ZionAds (somente IA)",
    description: "Plano para parceiros ZionAds: acesso à IA Laura, IA Jurídica, Boards e Agenda. Valor base customizável + monitoramento opcional.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 0,
  },
  {
    key: "plan_free",
    emoji: "🆓",
    label: "Acesso Livre (Sem Plano)",
    description: "Libera o acesso ao sistema sem cobrança vinculada. Ideal para demonstrações ou parcerias especiais.",
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
  return "plan_zionads";
}

