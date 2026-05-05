// Catálogo central dos módulos que podem ser concedidos/restringidos
// para operadores. Admin/member/gerente sempre têm acesso total via RLS.

import {
  MessageSquare,
  Kanban,
  CalendarDays,
  Briefcase,
  FileText,
  Wallet,
  Radar,
  Scale,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "conversations"
  | "kanban"
  | "agenda"
  | "cases"
  | "documents"
  | "financial"
  | "monitoring"
  | "legal_ai";

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  route: string;
  icon: LucideIcon;
  /** Se true, é concedido por padrão a operadores recém-criados */
  defaultForOperador: boolean;
  /** Módulos sensíveis (ex: financeiro) ficam desligados por padrão */
  sensitive?: boolean;
}

export const MODULE_CATALOG: ModuleDefinition[] = [
  {
    key: "conversations",
    label: "Conversas (WhatsApp)",
    description: "Atender leads pelo chat do WhatsApp.",
    route: "/conversations",
    icon: MessageSquare,
    defaultForOperador: true,
  },
  {
    key: "kanban",
    label: "Leads / Kanban",
    description: "Visualizar e mover leads no funil de vendas.",
    route: "/kanban",
    icon: Kanban,
    defaultForOperador: true,
  },
  {
    key: "agenda",
    label: "Agenda",
    description: "Criar e gerenciar reuniões e compromissos.",
    route: "/agenda",
    icon: CalendarDays,
    defaultForOperador: true,
  },
  {
    key: "cases",
    label: "Processos / Casos",
    description: "Acessar pasta de casos jurídicos dos clientes.",
    route: "/processos",
    icon: Briefcase,
    defaultForOperador: true,
  },
  {
    key: "documents",
    label: "Documentos",
    description: "Visualizar e enviar documentos dos leads/casos.",
    route: "/documentos",
    icon: FileText,
    defaultForOperador: true,
  },
  {
    key: "monitoring",
    label: "Monitoramento de Processos",
    description: "Acompanhar movimentações processuais.",
    route: "/monitoramento",
    icon: Radar,
    defaultForOperador: false,
  },
  {
    key: "legal_ai",
    label: "IA Jurídica",
    description: "Assistente para peças e pesquisa jurídica.",
    route: "/ia-juridica",
    icon: Scale,
    defaultForOperador: false,
  },
  {
    key: "financial",
    label: "Financeiro",
    description: "Receitas, despesas e cobranças. Acesso sensível.",
    route: "/financeiro",
    icon: Wallet,
    defaultForOperador: false,
    sensitive: true,
  },
];

export const MODULE_BY_ROUTE: Record<string, ModuleKey> = MODULE_CATALOG.reduce(
  (acc, m) => {
    acc[m.route] = m.key;
    return acc;
  },
  {} as Record<string, ModuleKey>
);

// Nichos disponíveis para roteamento de notificação por área
export interface NicheDefinition {
  key: string;
  label: string;
  emoji: string;
}

export const NICHE_CATALOG: NicheDefinition[] = [
  { key: "previdenciario", label: "Previdenciário", emoji: "👴" },
  { key: "trabalhista", label: "Trabalhista", emoji: "👷" },
  { key: "civel", label: "Cível", emoji: "⚖️" },
  { key: "consumidor", label: "Consumidor", emoji: "🛒" },
  { key: "familia", label: "Família", emoji: "👨‍👩‍👧" },
  { key: "criminal", label: "Criminal", emoji: "🚨" },
  { key: "tributario", label: "Tributário", emoji: "💰" },
  { key: "bancario_empresarial", label: "Bancário Empresarial / Dívidas PJ", emoji: "🏦" },
  { key: "empresarial", label: "Empresarial", emoji: "🏢" },
];
