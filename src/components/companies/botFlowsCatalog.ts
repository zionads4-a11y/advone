// Catálogo de TODOS os fluxos disponíveis no bot Laura, por nicho.
// O usuário (gerente) habilita/desabilita os que o escritório atende.
// Quando o prompt é montado dinamicamente, só os flow_keys habilitados aparecem
// no menu de abertura e nos blocos de fluxo do prompt.

export type Niche = "previdenciario" | "trabalhista" | "hibrido";

export interface BotFlowDefinition {
  flow_key: string;
  label: string;
  icon_emoji: string;
  description: string;
  case_type: string;
  default_enabled?: boolean;
}

export const PREVIDENCIARIO_FLOWS: BotFlowDefinition[] = [
  {
    flow_key: "aposentadoria",
    label: "Quero me aposentar (idade, tempo, especial)",
    icon_emoji: "1️⃣",
    description: "Aposentadoria por idade, tempo de contribuição, especial ou professor.",
    case_type: "aposentadoria",
    default_enabled: true,
  },
  {
    flow_key: "beneficio_negado",
    label: "Tive um benefício negado pelo INSS",
    icon_emoji: "2️⃣",
    description: "Indeferimento administrativo (DER) — recurso ou ação judicial.",
    case_type: "beneficio_negado",
    default_enabled: true,
  },
  {
    flow_key: "revisao_aposentadoria",
    label: "Quero revisar minha aposentadoria atual",
    icon_emoji: "3️⃣",
    description: "Revisão da vida toda, teto, melhor benefício, RMI etc.",
    case_type: "revisao_aposentadoria",
    default_enabled: true,
  },
  {
    flow_key: "bpc_loas",
    label: "Preciso de BPC/LOAS (idoso ou PCD)",
    icon_emoji: "4️⃣",
    description: "Benefício assistencial para idoso a partir de 65 anos ou pessoa com deficiência.",
    case_type: "bpc_loas",
    default_enabled: true,
  },
  {
    flow_key: "auxilio_invalidez",
    label: "Auxílio-doença ou aposentadoria por invalidez",
    icon_emoji: "5️⃣",
    description: "Auxílio por incapacidade temporária ou aposentadoria por incapacidade permanente.",
    case_type: "auxilio_invalidez",
    default_enabled: true,
  },
  {
    flow_key: "rmc_rcc",
    label: "Descontos indevidos no benefício (RMC / RCC)",
    icon_emoji: "6️⃣",
    description: "Reserva de Margem Consignável e Cartão Consignado descontados sem autorização — restituição em dobro + cancelamento.",
    case_type: "rmc_rcc",
    default_enabled: false,
  },
  {
    flow_key: "demora_inss",
    label: "Meu pedido no INSS está demorando",
    icon_emoji: "7️⃣",
    description: "Análise parada além de 45 dias úteis — bot pergunta a DER e classifica urgência.",
    case_type: "demora_inss",
    default_enabled: false,
  },
  {
    flow_key: "fallback_outros",
    label: "Outro assunto do INSS",
    icon_emoji: "8️⃣",
    description: "Qualificação livre quando o caso não se enquadra nos fluxos acima.",
    case_type: "fallback_outros",
    default_enabled: true,
  },
];

export const TRABALHISTA_FLOWS: BotFlowDefinition[] = [
  {
    flow_key: "rescisao_verbas",
    label: "Fui demitido(a) e acho que não recebi tudo",
    icon_emoji: "1️⃣",
    description: "Rescisão de contrato e verbas rescisórias.",
    case_type: "rescisao_verbas",
    default_enabled: true,
  },
  {
    flow_key: "horas_extras",
    label: "Trabalhava além do horário e não recebi horas extras",
    icon_emoji: "2️⃣",
    description: "Jornada extraordinária não paga ou indo para banco de horas indevido.",
    case_type: "horas_extras",
    default_enabled: true,
  },
  {
    flow_key: "vinculo_sem_carteira",
    label: "Trabalhava sem carteira assinada",
    icon_emoji: "3️⃣",
    description: "Reconhecimento de vínculo empregatício.",
    case_type: "vinculo_sem_carteira",
    default_enabled: true,
  },
  {
    flow_key: "acidente_trabalho",
    label: "Acidente ou doença por causa do trabalho",
    icon_emoji: "4️⃣",
    description: "Acidente de trabalho ou doença ocupacional.",
    case_type: "acidente_trabalho",
    default_enabled: true,
  },
  {
    flow_key: "assedio_moral",
    label: "Humilhação, pressão ou assédio no trabalho",
    icon_emoji: "5️⃣",
    description: "Assédio moral, sexual ou tratamento abusivo.",
    case_type: "assedio_moral",
    default_enabled: true,
  },
  {
    flow_key: "fallback_outros",
    label: "Outro tipo de situação",
    icon_emoji: "6️⃣",
    description: "Qualificação livre quando o caso não se enquadra nos fluxos acima.",
    case_type: "fallback_outros",
    default_enabled: true,
  },
];

export function getFlowCatalog(niche: Niche): BotFlowDefinition[] {
  if (niche === "trabalhista") return TRABALHISTA_FLOWS;
  if (niche === "hibrido") return [...PREVIDENCIARIO_FLOWS, ...TRABALHISTA_FLOWS];
  return PREVIDENCIARIO_FLOWS;
}
