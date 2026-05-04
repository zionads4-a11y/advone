// Modelos de cobrança disponíveis ao cadastrar uma empresa.
// Cada modelo define automaticamente:
//   - partnership_type (sempre "mensalidade_zionads")
//   - service_mode    (full = CRM completo / ai_only = só IA Laura)

export type BillingModel = "ia_only" | "crm_full";

export interface BillingModelOption {
  key: BillingModel;
  label: string;
  emoji: string;
  description: string;
  partnership_type: "mensalidade_zionads";
  service_mode: "full" | "ai_only";
}

export const BILLING_MODELS: BillingModelOption[] = [
  {
    key: "ia_only",
    emoji: "🤖",
    label: "IA Laura Avulsa (cliente compra só o uso da IA)",
    description:
      "Acesso restrito: Kanban, Agenda, Conversas e Configuração do Escritório. Sem CRM completo.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
  },
  {
    key: "crm_full",
    emoji: "🏢",
    label: "CRM Completo (cliente compra tudo)",
    description:
      "Sistema completo: CRM, IA, Financeiro, Kanban, Agenda, Contratos, Documentos. Mensalidade fixa.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
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

