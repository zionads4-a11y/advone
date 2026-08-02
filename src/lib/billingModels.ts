// Modelos de cobrança disponíveis ao cadastrar uma empresa.
// Estrutura enxuta em 5 planos:
//   - plan_mensal      → AdvOne · Mensal    · R$ 897/mês
//   - plan_semestral   → AdvOne · Semestral · R$ 797/mês
//   - plan_anual       → AdvOne · Anual     · R$ 597/mês
//   - plan_ia_zionads  → ZionAds (cortesia, cobrado fora da plataforma)
//   - plan_enterprise  → Sob medida (valor manual definido pelo gerente)
//
// Todos os planos comerciais entregam o mesmo pacote — a diferença é
// apenas o compromisso de tempo (quanto mais longo, menor a mensalidade).
// Chaves legadas continuam válidas em tempo de execução para não quebrar
// empresas existentes, mas não aparecem mais na UI de cadastro/edição.

export type BillingModel =
  | "plan_mensal"
  | "plan_semestral"
  | "plan_anual"
  | "plan_ia_zionads"
  | "plan_enterprise"
  // legado — mantido apenas para compatibilidade de leitura
  | "plan_ia"
  | "plan_ia_pro"
  | "plan_gestao"
  | "plan_complete"
  | "plan_completo"
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
  monthly_value: number;
  partnership_type: "mensalidade_zionads";
  service_mode: "full" | "ai_only";
  monitoring_quota: number;
  /** Cota padrão de mensagens/mês da IA aplicada ao criar a empresa. `null` = ilimitado. */
  message_quota_default?: number | null;
  features: string[];
}

const COMMERCIAL_FEATURES = [
  "CRM jurídico completo (Kanban, Agenda, Financeiro)",
  "Laura — SDR com IA no WhatsApp 24h",
  "5.000 mensagens/mês da IA",
  "Monitoramento de processos (Escavador)",
  "Integrações: Google, Asaas, ZapSign",
];

export const BILLING_MODELS: BillingModelOption[] = [
  {
    key: "plan_mensal",
    emoji: "📅",
    label: "AdvOne · Mensal",
    monthly_value: 897,
    description: "Compromisso mês a mês, sem fidelidade. Cancele quando quiser.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    message_quota_default: 5000,
    features: COMMERCIAL_FEATURES,
  },
  {
    key: "plan_semestral",
    emoji: "📈",
    label: "AdvOne · Semestral",
    monthly_value: 797,
    description: "Compromisso de 6 meses — economia de R$ 100/mês frente ao mensal.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    message_quota_default: 5000,
    features: COMMERCIAL_FEATURES,
  },
  {
    key: "plan_anual",
    emoji: "🏆",
    label: "AdvOne · Anual",
    monthly_value: 597,
    description: "Melhor custo-benefício. Compromisso de 12 meses — economia de R$ 300/mês.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    message_quota_default: 5000,
    features: COMMERCIAL_FEATURES,
  },
  {
    key: "plan_ia_zionads",
    emoji: "⚡",
    label: "ZionAds (cortesia)",
    monthly_value: 0,
    description: "Cliente da agência ZionAds — cobrança tratada fora da plataforma. Não gera assinatura no Asaas.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    message_quota_default: 5000,
    features: [
      ...COMMERCIAL_FEATURES,
      "Cobrança gerenciada pela agência ZionAds",
      "Sem cobrança automática no Asaas",
      "Só o time ZionAds pode cadastrar",
    ],
  },
  {
    key: "plan_enterprise",
    emoji: "🏛️",
    label: "AdvOne Enterprise",
    monthly_value: 0,
    description: "Sob medida — valor definido manualmente pelo gerente. Áreas e equipe ilimitadas, SLA e onboarding dedicados.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 100,
    message_quota_default: null,
    features: [
      "Tudo dos planos comerciais",
      "Áreas de atuação ilimitadas",
      "Equipe ilimitada por área",
      "Módulo Conversas de Clientes (atendimento humano)",
      "Transferência entre áreas e advogados com log auditável",
      "SLA e onboarding dedicados",
    ],
  },
];

// Legado — usado apenas para exibir label/description de empresas antigas.
const LEGACY_BILLING_MODELS: BillingModelOption[] = [
  {
    key: "plan_ia",
    emoji: "🤖",
    label: "AdvOne IA (legado)",
    monthly_value: 897,
    description: "Legado — substituído pelos planos Mensal/Semestral/Anual.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 10,
    features: [],
  },
  {
    key: "plan_ia_pro",
    emoji: "🚀",
    label: "AdvOne IA Pro (legado)",
    monthly_value: 797,
    description: "Legado — substituído pelos planos Mensal/Semestral/Anual.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 20,
    features: [],
  },
  {
    key: "plan_gestao",
    emoji: "📊",
    label: "AdvOne Gestão (legado)",
    monthly_value: 597,
    description: "Legado — substituído pelos planos Mensal/Semestral/Anual.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    features: [],
  },
  {
    key: "plan_complete",
    emoji: "🚀",
    label: "AdvOne Complete (legado)",
    monthly_value: 897,
    description: "Legado — substituído pelos planos Mensal/Semestral/Anual.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    features: [],
  },
  {
    key: "plan_completo",
    emoji: "🚀",
    label: "Plano Completo (legado)",
    monthly_value: 897,
    description: "Legado — substituído pelo AdvOne Complete.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    features: [],
  },
  {
    key: "plan_ia_monthly",
    emoji: "🤖",
    label: "Plano IA Mensal (legado)",
    monthly_value: 397,
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    features: [],
  },
  {
    key: "plan_ia_6m",
    emoji: "🤖",
    label: "Plano IA 6 Meses (legado)",
    monthly_value: 397,
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    features: [],
  },
  {
    key: "plan_ia_12m",
    emoji: "🤖",
    label: "Plano IA 12 Meses (legado)",
    monthly_value: 397,
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    features: [],
  },
  {
    key: "plan_zionads",
    emoji: "🚀",
    label: "Plano ZionAds (legado)",
    monthly_value: 0,
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 0,
    features: [],
  },
  {
    key: "plan_free",
    emoji: "🆓",
    label: "Acesso Livre (legado)",
    monthly_value: 0,
    description: "Legado.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 0,
    features: [],
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
  return service_mode === "ai_only" ? "plan_mensal" : "plan_mensal";
}
