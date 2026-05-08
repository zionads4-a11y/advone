// Modelos de cobrança disponíveis ao cadastrar uma empresa.
// Cada modelo define automaticamente:
//   - partnership_type (sempre "mensalidade_zionads")
//   - service_mode    (full = CRM completo / ai_only = só IA Laura)

export type BillingModel = "plan_admin" | "plan_completo" | "ia_only" | "crm_full";

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
    key: "plan_admin",
    emoji: "💼",
    label: "Plano Admin (R$ 297/mês)",
    description: "CRM completo, Agenda, Financeiro, Docs. WhatsApp (só notificações). IA Gemini. 20 monitoramentos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 20,
  },
  {
    key: "plan_completo",
    emoji: "🚀",
    label: "Plano Completo (R$ 497/mês)",
    description: "Tudo do Admin + Bot SDR (Laura), IA Jurídica Claude, Alertas de Fraude, Boards. 50 monitoramentos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 50,
  },
  {
    key: "ia_only",
    emoji: "🤖",
    label: "IA Laura Avulsa (Legado)",
    description: "Acesso restrito: Kanban, Agenda, Conversas e Configuração do Escritório.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 10,
  },
  {
    key: "crm_full",
    emoji: "🏢",
    label: "CRM Completo (Legado)",
    description: "Sistema completo com IA e Financeiro.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 30,
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
  if (service_mode === "ai_only") return "ia_only";
  return "crm_full";
}

