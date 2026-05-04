// Catálogo de TODOS os fluxos disponíveis no bot Laura/Julia, por nicho.
// O usuário (gerente) habilita/desabilita os que o escritório atende.
// Quando o prompt é montado dinamicamente, só os flow_keys habilitados aparecem
// no menu de abertura e nos blocos de fluxo do prompt.

export type Niche =
  | "previdenciario"
  | "trabalhista"
  | "hibrido"
  | "civel"
  | "familia"
  | "criminal"
  | "tributario";

export interface BotFlowDefinition {
  flow_key: string;
  label: string;
  icon_emoji: string;
  description: string;
  case_type: string;
  default_enabled?: boolean;
}

export const PREVIDENCIARIO_FLOWS: BotFlowDefinition[] = [
  { flow_key: "aposentadoria", label: "Quero me aposentar (idade, tempo, especial)", icon_emoji: "1️⃣", description: "Aposentadoria por idade, tempo de contribuição, especial ou professor.", case_type: "aposentadoria", default_enabled: true },
  { flow_key: "beneficio_negado", label: "Tive um benefício negado pelo INSS", icon_emoji: "2️⃣", description: "Indeferimento administrativo (DER) — recurso ou ação judicial.", case_type: "beneficio_negado", default_enabled: true },
  { flow_key: "revisao_aposentadoria", label: "Quero revisar minha aposentadoria atual", icon_emoji: "3️⃣", description: "Revisão da vida toda, teto, melhor benefício, RMI etc.", case_type: "revisao_aposentadoria", default_enabled: true },
  { flow_key: "bpc_loas", label: "Preciso de BPC/LOAS (idoso ou PCD)", icon_emoji: "4️⃣", description: "Benefício assistencial para idoso a partir de 65 anos ou pessoa com deficiência.", case_type: "bpc_loas", default_enabled: true },
  { flow_key: "auxilio_invalidez", label: "Auxílio-doença ou aposentadoria por invalidez", icon_emoji: "5️⃣", description: "Auxílio por incapacidade temporária ou aposentadoria por incapacidade permanente.", case_type: "auxilio_invalidez", default_enabled: true },
  { flow_key: "rmc_rcc", label: "Descontos indevidos no benefício (RMC / RCC)", icon_emoji: "6️⃣", description: "Reserva de Margem Consignável e Cartão Consignado descontados sem autorização — restituição em dobro + cancelamento.", case_type: "rmc_rcc", default_enabled: false },
  { flow_key: "demora_inss", label: "Meu pedido no INSS está demorando", icon_emoji: "7️⃣", description: "Análise parada além de 45 dias úteis — bot pergunta a DER e classifica urgência.", case_type: "demora_inss", default_enabled: false },
  { flow_key: "salario_maternidade", label: "Salário-Maternidade (gestante, adotante, desempregada)", icon_emoji: "8️⃣", description: "Salário-maternidade para seguradas empregadas, MEI, contribuinte individual, desempregada (período de graça) ou adotante.", case_type: "salario_maternidade", default_enabled: true },
  { flow_key: "fallback_outros", label: "Outro assunto do INSS", icon_emoji: "9️⃣", description: "Qualificação livre quando o caso não se enquadra nos fluxos acima.", case_type: "fallback_outros", default_enabled: true },
];

export const TRABALHISTA_FLOWS: BotFlowDefinition[] = [
  { flow_key: "rescisao_verbas", label: "Fui demitido(a) e acho que não recebi tudo", icon_emoji: "1️⃣", description: "Rescisão de contrato e verbas rescisórias.", case_type: "rescisao_verbas", default_enabled: true },
  { flow_key: "horas_extras", label: "Trabalhava além do horário e não recebi horas extras", icon_emoji: "2️⃣", description: "Jornada extraordinária não paga ou indo para banco de horas indevido.", case_type: "horas_extras", default_enabled: true },
  { flow_key: "vinculo_sem_carteira", label: "Trabalhava sem carteira assinada", icon_emoji: "3️⃣", description: "Reconhecimento de vínculo empregatício.", case_type: "vinculo_sem_carteira", default_enabled: true },
  { flow_key: "acidente_trabalho", label: "Acidente ou doença por causa do trabalho", icon_emoji: "4️⃣", description: "Acidente de trabalho ou doença ocupacional.", case_type: "acidente_trabalho", default_enabled: true },
  { flow_key: "assedio_moral", label: "Humilhação, pressão ou assédio no trabalho", icon_emoji: "5️⃣", description: "Assédio moral, sexual ou tratamento abusivo.", case_type: "assedio_moral", default_enabled: true },
  { flow_key: "fallback_outros", label: "Outro tipo de situação", icon_emoji: "6️⃣", description: "Qualificação livre quando o caso não se enquadra nos fluxos acima.", case_type: "fallback_outros", default_enabled: true },
];

export const CIVEL_FLOWS: BotFlowDefinition[] = [
  { flow_key: "indenizacao_dano_moral", label: "Quero pedir indenização por dano moral", icon_emoji: "1️⃣", description: "Dano moral por ofensa, constrangimento, exposição indevida.", case_type: "indenizacao_dano_moral", default_enabled: true },
  { flow_key: "problema_banco", label: "Tive problema com banco / financeira", icon_emoji: "2️⃣", description: "Empréstimo não contratado, juros abusivos, descontos indevidos, negativação injusta.", case_type: "problema_banco", default_enabled: true },
  { flow_key: "problema_loja_produto", label: "Comprei um produto ou serviço com defeito", icon_emoji: "3️⃣", description: "Produto com defeito, serviço não entregue, cobrança indevida, propaganda enganosa.", case_type: "problema_loja_produto", default_enabled: true },
  { flow_key: "plano_saude", label: "Plano de saúde negou cobertura ou aumentou abusivamente", icon_emoji: "4️⃣", description: "Negativa de cirurgia/exame/medicamento, reajuste abusivo, cancelamento unilateral.", case_type: "plano_saude", default_enabled: true },
  { flow_key: "cia_aerea", label: "Tive problema com voo (atraso, cancelamento, bagagem)", icon_emoji: "5️⃣", description: "Atraso, cancelamento, overbooking, extravio ou dano de bagagem.", case_type: "cia_aerea", default_enabled: true },
  { flow_key: "fallback_outros", label: "Outro problema cível ou de consumidor", icon_emoji: "6️⃣", description: "Qualificação livre para casos cíveis variados.", case_type: "fallback_outros", default_enabled: true },
];

export const FAMILIA_FLOWS: BotFlowDefinition[] = [
  { flow_key: "divorcio", label: "Quero me divorciar", icon_emoji: "1️⃣", description: "Divórcio consensual ou litigioso, com ou sem partilha de bens.", case_type: "divorcio", default_enabled: true },
  { flow_key: "pensao_alimenticia", label: "Pensão alimentícia (pedir, revisar ou cobrar)", icon_emoji: "2️⃣", description: "Fixação, revisão (aumento/redução), execução de pensão alimentícia.", case_type: "pensao_alimenticia", default_enabled: true },
  { flow_key: "guarda_visitas", label: "Guarda de filho(a) ou regulamentação de visitas", icon_emoji: "3️⃣", description: "Guarda unilateral, compartilhada, alienação parental, visitas.", case_type: "guarda_visitas", default_enabled: true },
  { flow_key: "inventario", label: "Inventário / partilha de herança", icon_emoji: "4️⃣", description: "Inventário judicial ou extrajudicial, partilha, sobrepartilha.", case_type: "inventario", default_enabled: true },
  { flow_key: "uniao_estavel", label: "União estável (reconhecer ou dissolver)", icon_emoji: "5️⃣", description: "Reconhecimento ou dissolução de união estável, partilha de bens.", case_type: "uniao_estavel", default_enabled: true },
  { flow_key: "fallback_outros", label: "Outro assunto de família", icon_emoji: "6️⃣", description: "Qualificação livre para casos de família variados.", case_type: "fallback_outros", default_enabled: true },
];

export const CRIMINAL_FLOWS: BotFlowDefinition[] = [
  { flow_key: "preso_flagrante", label: "Tem alguém preso (flagrante ou audiência de custódia)", icon_emoji: "1️⃣", description: "Atendimento urgente para flagrante, audiência de custódia, pedido de liberdade.", case_type: "preso_flagrante", default_enabled: true },
  { flow_key: "inquerito_intimacao", label: "Recebi intimação da polícia ou estou em inquérito", icon_emoji: "2️⃣", description: "Intimação policial, oitiva, indiciamento, inquérito policial.", case_type: "inquerito_intimacao", default_enabled: true },
  { flow_key: "audiencia_processo", label: "Tenho audiência ou processo criminal em andamento", icon_emoji: "3️⃣", description: "Defesa em ação penal, audiência de instrução, alegações finais.", case_type: "audiencia_processo", default_enabled: true },
  { flow_key: "recurso_habeas", label: "Quero recorrer / pedir habeas corpus", icon_emoji: "4️⃣", description: "Apelação, recurso, habeas corpus, revisão criminal.", case_type: "recurso_habeas", default_enabled: true },
  { flow_key: "execucao_penal", label: "Já condenado — progressão, livramento, indulto", icon_emoji: "5️⃣", description: "Execução penal, progressão de regime, livramento condicional, indulto.", case_type: "execucao_penal", default_enabled: true },
  { flow_key: "fallback_outros", label: "Outra situação criminal", icon_emoji: "6️⃣", description: "Qualificação livre para casos criminais variados.", case_type: "fallback_outros", default_enabled: true },
];

export const TRIBUTARIO_FLOWS: BotFlowDefinition[] = [
  { flow_key: "recuperacao_tributos", label: "Quero recuperar tributos pagos a mais", icon_emoji: "1️⃣", description: "Recuperação de PIS/COFINS, ICMS, exclusão do ICMS da base, créditos tributários.", case_type: "recuperacao_tributos", default_enabled: true },
  { flow_key: "defesa_fiscal", label: "Recebi auto de infração / cobrança fiscal", icon_emoji: "2️⃣", description: "Defesa em auto de infração, execução fiscal, parcelamento, CDA.", case_type: "defesa_fiscal", default_enabled: true },
  { flow_key: "planejamento_tributario", label: "Quero pagar menos imposto (planejamento)", icon_emoji: "3️⃣", description: "Planejamento tributário, escolha de regime (Simples, Lucro Presumido/Real), reorganização societária.", case_type: "planejamento_tributario", default_enabled: true },
  { flow_key: "contratos_empresariais", label: "Preciso de contrato empresarial / comercial", icon_emoji: "4️⃣", description: "Elaboração e revisão de contratos, NDA, prestação de serviços, distribuição.", case_type: "contratos_empresariais", default_enabled: true },
  { flow_key: "societario", label: "Sociedade — abertura, alteração, conflito entre sócios", icon_emoji: "5️⃣", description: "Constituição de empresa, alteração contratual, dissolução parcial, conflito societário.", case_type: "societario", default_enabled: true },
  { flow_key: "fallback_outros", label: "Outro assunto tributário ou empresarial", icon_emoji: "6️⃣", description: "Qualificação livre para casos tributários/empresariais variados.", case_type: "fallback_outros", default_enabled: true },
];

export function getFlowCatalog(niche: Niche): BotFlowDefinition[] {
  if (niche === "trabalhista") return TRABALHISTA_FLOWS;
  if (niche === "hibrido") return [...PREVIDENCIARIO_FLOWS, ...TRABALHISTA_FLOWS];
  if (niche === "civel") return CIVEL_FLOWS;
  if (niche === "familia") return FAMILIA_FLOWS;
  if (niche === "criminal") return CRIMINAL_FLOWS;
  if (niche === "tributario") return TRIBUTARIO_FLOWS;
  return PREVIDENCIARIO_FLOWS;
}
