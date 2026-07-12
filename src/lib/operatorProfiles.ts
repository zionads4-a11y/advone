import type { OperatorProfile } from "@/hooks/useOperatorProfile";
import type { ModuleKey } from "@/lib/modulePermissions";

export const OPERATOR_PROFILE_LABELS: Record<OperatorProfile, string> = {
  master: "Advogado Master",
  advogado_responsavel: "Advogado Responsável",
  estagiario: "Estagiário",
  sdr_closer: "SDR / Closer",
  financeiro: "Financeiro",
};

export const OPERATOR_PROFILE_DESCRIPTIONS: Record<OperatorProfile, string> = {
  master:
    "Acesso total. Único que cria/edita quadros, áreas, integrações e cadastra usuários.",
  advogado_responsavel:
    "Vê e movimenta cards nos quadros das áreas atribuídas. Cria notas e diário.",
  estagiario:
    "Vê e movimenta cards nas áreas atribuídas. Master decide se enxerga todos os cards da área ou só os do seu time.",
  sdr_closer:
    "Só Kanban Comercial e Conversas. Nunca vê honorários. Perde acesso ao lead depois de encaminhar para a área jurídica.",
  financeiro:
    "Acesso total ao módulo Financeiro (ver e editar). Não vê Kanban de processos.",
};

/**
 * Módulos padrão que cada perfil pode acessar. Master ignora tudo (acesso total).
 * O Master ainda pode restringir ou liberar módulos individualmente via UI.
 */
export const OPERATOR_PROFILE_DEFAULT_MODULES: Record<OperatorProfile, ModuleKey[]> = {
  master: [
    "conversations","kanban","agenda","cases","documents","financial","monitoring","legal_ai",
  ],
  advogado_responsavel: [
    "kanban","agenda","cases","documents","monitoring","legal_ai",
  ],
  estagiario: [
    "kanban","agenda","cases","documents","monitoring",
  ],
  sdr_closer: [
    "conversations","kanban","agenda",
  ],
  financeiro: [
    "financial",
  ],
};

/**
 * Rotas do sidebar permitidas por perfil. Se null, usa o menu padrão do userRole.
 */
export const OPERATOR_PROFILE_ROUTES: Record<OperatorProfile, string[]> = {
  master: [
    "/kanban","/tarefas","/clientes","/agenda","/conversations","/monitoramento",
    "/processos-kanban","/ia-juridica","/jurisprudencia","/calculadoras",
    "/modelos-documentos","/financeiro","/client-users","/access-management","/company-settings",
  ],
  advogado_responsavel: [
    "/kanban","/tarefas","/clientes","/agenda","/processos-kanban",
    "/ia-juridica","/jurisprudencia","/calculadoras","/monitoramento","/modelos-documentos",
  ],
  estagiario: [
    "/tarefas","/clientes","/agenda","/processos-kanban","/monitoramento","/modelos-documentos",
  ],
  sdr_closer: [
    "/kanban","/conversations","/agenda","/tarefas",
  ],
  financeiro: [
    "/financeiro","/tarefas","/agenda",
  ],
};
