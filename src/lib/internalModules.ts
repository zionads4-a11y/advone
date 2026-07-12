// Catálogo de módulos administrativos concedidos ao time interno AdvOne.
// Admins têm tudo automaticamente. Members só veem o que estiver marcado aqui.

import {
  Building2,
  BadgeDollarSign,
  CreditCard,
  Wallet,
  Radar,
  ShieldAlert,
  Sparkles,
  Users2,
  Webhook,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export type InternalModuleKey =
  | "companies_manage"
  | "companies_discount"
  | "billing_plans"
  | "subscriptions"
  | "financial_global"
  | "collections_overdue"
  | "support_ops"
  | "monitoring_global"
  | "fraud_alerts"
  | "leads_landing"
  | "webhook_logs"
  | "internal_staff_manage";

export interface InternalModule {
  key: InternalModuleKey;
  label: string;
  description: string;
  icon: LucideIcon;
  category: "Comercial" | "Financeiro" | "Operação" | "Administração";
}

export const INTERNAL_MODULE_CATALOG: InternalModule[] = [
  { key: "companies_manage",   label: "Cadastrar empresas",        description: "Criar novas empresas clientes e editar dados básicos.",              icon: Building2,      category: "Comercial" },
  { key: "billing_plans",      label: "Definir plano da empresa",  description: "Escolher plano (IA, Gestão, Complete, Enterprise) no cadastro.",     icon: BadgeDollarSign, category: "Comercial" },
  { key: "companies_discount", label: "Aplicar descontos",         description: "Conceder desconto na mensalidade (aprovação de gerente).",           icon: Sparkles,        category: "Comercial" },
  { key: "subscriptions",      label: "Assinaturas",               description: "Ver e gerenciar assinaturas Asaas de todas as empresas.",            icon: CreditCard,      category: "Financeiro" },
  { key: "financial_global",   label: "Financeiro (visão completa)", description: "Painel financeiro global, faturas mensais e receita de todas as empresas.", icon: Wallet,          category: "Financeiro" },
  { key: "collections_overdue", label: "Cobrança (inadimplentes)",   description: "Vê apenas empresas com pagamento atrasado, para acionar cobrança.",         icon: Wallet,          category: "Financeiro" },
  { key: "support_ops",        label: "Suporte / Atendimento",     description: "Central de atendimento, ver conversas técnicas com clientes.",       icon: Users2,          category: "Operação" },
  { key: "monitoring_global",  label: "Monitoramento global",      description: "Ver todos processos monitorados de todas empresas.",                 icon: Radar,           category: "Operação" },
  { key: "webhook_logs",       label: "Logs de webhook",           description: "Diagnóstico de integrações (Asaas, ZapSign, Escavador).",            icon: Webhook,         category: "Operação" },
  { key: "fraud_alerts",       label: "Alertas de fraude",         description: "Investigar leads suspeitos marcados como perdidos.",                 icon: ShieldAlert,     category: "Operação" },
  { key: "leads_landing",      label: "Leads da landing",          description: "Ver quem se cadastrou pela landing page pública.",                   icon: Landmark,        category: "Comercial" },
  { key: "internal_staff_manage", label: "Gerenciar time interno", description: "Criar/editar outros funcionários AdvOne (apenas admins).",           icon: Users2,          category: "Administração" },
];
