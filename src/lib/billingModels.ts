// Modelos de cobrança disponíveis ao cadastrar uma empresa.
// Estrutura em 3 planos (a mesma escada exibida nas landing pages):
//   - plan_ia       → AdvOne IA        · R$ 397/mês · menu enxuto (Dashboard, Kanban, Clientes, Agenda, Conversas, Monitoramento)
//   - plan_gestao   → AdvOne Gestão    · R$ 597/mês · CRM completo sem os recursos exclusivos (IA jurídica, jurisprudência etc.)
//   - plan_complete → AdvOne Complete  · R$ 897/mês · tudo incluso
//
// Chaves legadas (plan_completo, plan_ia_monthly, plan_ia_6m, plan_ia_12m, plan_zionads, plan_free)
// continuam válidas em tempo de execução para não quebrar empresas existentes,
// mas não aparecem mais na UI de cadastro/edição.

export type BillingModel =
  | "plan_ia"
  | "plan_ia_pro"
  | "plan_ia_zionads"
  | "plan_gestao"
  | "plan_complete"
  | "plan_enterprise"
  // legado — mantido apenas para compatibilidade de leitura
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
  /** Cota padrão de mensagens/mês da IA aplicada ao criar a empresa. `null`/omitido = default do plano. */
  message_quota_default?: number | null;
  features: string[];
}

export const BILLING_MODELS: BillingModelOption[] = [
  {
    key: "plan_ia",
    emoji: "🤖",
    label: "AdvOne IA",
    monthly_value: 397,
    description: "Sua secretária virtual 24h no WhatsApp — para parar de perder lead.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 10,
    message_quota_default: 15000,
    features: [
      "Atendimento no WhatsApp 24h",
      "Qualificação inteligente de leads",
      "Agendamento automático na agenda",
      "Atendimento a clientes atuais",
      "15.000 mensagens/mês da IA",
    ],
  },
  {
    key: "plan_ia_pro",
    emoji: "🚀",
    label: "AdvOne IA Pro",
    monthly_value: 797,
    description: "Para escritórios com alto volume de leads: até 15.000 mensagens/mês da Laura.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 20,
    message_quota_default: 15000,
    features: [
      "Todos os recursos do AdvOne IA",
      "15.000 mensagens/mês da IA (50% a mais)",
      "Prioridade de fila em horários de pico",
      "Ideal para escritórios com campanhas ativas",
    ],
  },
  {
    key: "plan_ia_zionads",
    emoji: "⚡",
    label: "AdvOne IA · ZionAds (cortesia)",
    monthly_value: 0,
    description: "Mesmo pacote do AdvOne IA, com cobrança tratada fora da plataforma pela ZionAds. Sem gerar assinatura no Asaas.",
    partnership_type: "mensalidade_zionads",
    service_mode: "ai_only",
    monitoring_quota: 10,
    message_quota_default: 15000,
    features: [
      "Todos os recursos do AdvOne IA",
      "Cobrança gerenciada fora da plataforma (ZionAds)",
      "Sem cobrança automática no Asaas",
      "Só o time ZionAds pode cadastrar",
    ],
  },
  {
    key: "plan_gestao",
    emoji: "📊",
    label: "AdvOne Gestão",
    monthly_value: 597,
    description: "CRM jurídico completo para organizar escritório e time.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    message_quota_default: 15000,
    features: [
      "CRM jurídico completo",
      "Até 3 áreas de atuação",
      "Até 3 advogados por área",
      "Pipeline (Kanban de leads e casos)",
      "Automações, cadências e relatórios",
    ],
  },
  {
    key: "plan_complete",
    emoji: "🚀",
    label: "AdvOne Complete",
    monthly_value: 897,
    description: "Tudo do IA + tudo do Gestão + integrações e recursos exclusivos.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 10,
    message_quota_default: null,
    features: [
      "Tudo do plano IA",
      "Tudo do plano Gestão",
      "Integrações avançadas (Google, Asaas, ZapSign)",
      "IA jurídica, jurisprudência e calculadoras",
      "Suporte prioritário",
    ],
  },
  {
    key: "plan_enterprise",
    emoji: "🏛️",
    label: "AdvOne Enterprise",
    monthly_value: 0,
    description: "Sob medida — atendimento humano a clientes ativos, separado do funil, com auditoria completa.",
    partnership_type: "mensalidade_zionads",
    service_mode: "full",
    monitoring_quota: 100,
    message_quota_default: null,
    features: [
      "Tudo do plano Complete",
      "Áreas de atuação ilimitadas (4+)",
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
  return service_mode === "ai_only" ? "plan_ia" : "plan_complete";
}
