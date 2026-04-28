// Utilitários para templates de documentos com placeholders {{variavel}}

export interface TemplateVariable {
  key: string;
  label: string;
  source: "lead" | "company" | "manual" | "system";
}

// Variáveis padrão disponíveis a partir do lead/cliente
export const LEAD_VARIABLES: TemplateVariable[] = [
  { key: "nome", label: "Nome do cliente", source: "lead" },
  { key: "cpf", label: "CPF", source: "lead" },
  { key: "rg", label: "RG", source: "lead" },
  { key: "estado_civil", label: "Estado civil", source: "lead" },
  { key: "profissao", label: "Profissão", source: "lead" },
  { key: "nacionalidade", label: "Nacionalidade", source: "lead" },
  { key: "email", label: "E-mail", source: "lead" },
  { key: "whatsapp", label: "WhatsApp", source: "lead" },
  { key: "telefone", label: "Telefone", source: "lead" },
  { key: "endereco_rua", label: "Rua", source: "lead" },
  { key: "endereco_numero", label: "Número", source: "lead" },
  { key: "endereco_complemento", label: "Complemento", source: "lead" },
  { key: "endereco_bairro", label: "Bairro", source: "lead" },
  { key: "endereco_cidade", label: "Cidade", source: "lead" },
  { key: "endereco_estado", label: "Estado", source: "lead" },
  { key: "endereco_cep", label: "CEP", source: "lead" },
  { key: "endereco_completo", label: "Endereço completo", source: "lead" },
  { key: "banco", label: "Banco", source: "lead" },
  { key: "agencia", label: "Agência", source: "lead" },
  { key: "conta", label: "Conta", source: "lead" },
  { key: "tipo_chave_pix", label: "Tipo da chave PIX", source: "lead" },
  { key: "chave_pix", label: "Chave PIX", source: "lead" },
  { key: "area_direito", label: "Área do direito", source: "lead" },
  { key: "tipo_caso_detalhado", label: "Tipo de caso", source: "lead" },
  { key: "numero_processo", label: "Número do processo", source: "lead" },
];

export const COMPANY_VARIABLES: TemplateVariable[] = [
  { key: "empresa_nome", label: "Nome do escritório", source: "company" },
];

export const SYSTEM_VARIABLES: TemplateVariable[] = [
  { key: "data_hoje", label: "Data de hoje (extenso)", source: "system" },
  { key: "data_hoje_curta", label: "Data de hoje (DD/MM/AAAA)", source: "system" },
  { key: "cidade_data", label: "Cidade, dia de mês de ano", source: "system" },
];

export const ALL_VARIABLES = [...LEAD_VARIABLES, ...COMPANY_VARIABLES, ...SYSTEM_VARIABLES];

// Extrai placeholders {{xxx}} do conteúdo
export function extractPlaceholders(content: string): string[] {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const set = new Set<string>();
  let m;
  while ((m = re.exec(content)) !== null) set.add(m[1]);
  return Array.from(set);
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatDateExtenso(d: Date) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatDateCurta(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export interface RenderContext {
  lead?: any;
  company?: { name?: string };
  manualValues?: Record<string, string>;
}

export function buildAutoValues(ctx: RenderContext): Record<string, string> {
  const out: Record<string, string> = {};
  const lead = ctx.lead || {};
  const company = ctx.company || {};

  // Lead
  out.nome = lead.name ?? "";
  out.cpf = lead.cpf_cliente_final ?? lead.cpf ?? "";
  out.rg = lead.rg ?? "";
  out.estado_civil = lead.estado_civil ?? "";
  out.profissao = lead.profissao ?? "";
  out.nacionalidade = lead.nacionalidade ?? "brasileiro(a)";
  out.email = lead.email ?? "";
  out.whatsapp = lead.whatsapp ?? "";
  out.telefone = lead.phone ?? lead.whatsapp ?? "";
  out.endereco_rua = lead.endereco_rua ?? "";
  out.endereco_numero = lead.endereco_numero ?? "";
  out.endereco_complemento = lead.endereco_complemento ?? "";
  out.endereco_bairro = lead.endereco_bairro ?? "";
  out.endereco_cidade = lead.endereco_cidade ?? "";
  out.endereco_estado = lead.endereco_estado ?? "";
  out.endereco_cep = lead.endereco_cep ?? "";
  out.endereco_completo = [
    [lead.endereco_rua, lead.endereco_numero].filter(Boolean).join(", "),
    lead.endereco_complemento,
    lead.endereco_bairro,
    [lead.endereco_cidade, lead.endereco_estado].filter(Boolean).join(" - "),
    lead.endereco_cep ? `CEP ${lead.endereco_cep}` : "",
  ].filter(Boolean).join(", ");
  out.banco = lead.banco ?? "";
  out.agencia = lead.agencia ?? "";
  out.conta = lead.conta ?? "";
  out.tipo_chave_pix = lead.tipo_chave_pix ?? "";
  out.chave_pix = lead.chave_pix ?? "";
  out.area_direito = lead.area_direito ?? lead.niche ?? "";
  out.tipo_caso_detalhado = lead.tipo_caso_detalhado ?? lead.case_type ?? "";
  out.numero_processo = lead.numero_processo ?? lead.process_number ?? "";

  // Company
  out.empresa_nome = company.name ?? "";

  // System
  const hoje = new Date();
  out.data_hoje = formatDateExtenso(hoje);
  out.data_hoje_curta = formatDateCurta(hoje);
  out.cidade_data = `${lead.endereco_cidade || "____"}, ${formatDateExtenso(hoje)}`;

  // Manual overrides
  if (ctx.manualValues) {
    for (const [k, v] of Object.entries(ctx.manualValues)) {
      if (v !== undefined && v !== null && v !== "") out[k] = v;
    }
  }

  return out;
}

export function renderTemplate(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return values[key] ?? `___${key}___`;
  });
}

export const DOCUMENT_CATEGORIES = [
  { value: "procuracao", label: "Procuração" },
  { value: "contrato", label: "Contrato de Honorários" },
  { value: "declaracao", label: "Declaração" },
  { value: "peticao", label: "Petição" },
  { value: "outros", label: "Outros" },
];

export const SAMPLE_TEMPLATES = [
  {
    name: "Procuração Ad Judicia",
    category: "procuracao",
    description: "Procuração padrão para representação em juízo",
    content: `PROCURAÇÃO AD JUDICIA ET EXTRA

OUTORGANTE: {{nome}}, {{nacionalidade}}, {{estado_civil}}, {{profissao}}, portador(a) do RG nº {{rg}} e inscrito(a) no CPF sob o nº {{cpf}}, residente e domiciliado(a) à {{endereco_completo}}.

OUTORGADO: {{empresa_nome}}, com endereço profissional conforme contrato.

PODERES: Pelo presente instrumento particular de procuração, o(a) outorgante nomeia e constitui seu(sua) bastante procurador(a), o(a) outorgado(a) acima qualificado(a), para o fim especial de representá-lo(a) em juízo ou fora dele, podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando dos recursos legais e acompanhando-os, conferindo-lhe, ainda, poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre que se funda a ação, receber, dar quitação, firmar compromissos e assinar declarações.

{{cidade_data}}.


_______________________________________
{{nome}}
CPF: {{cpf}}`,
  },
  {
    name: "Contrato de Honorários",
    category: "contrato",
    description: "Contrato de prestação de serviços advocatícios",
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

CONTRATANTE: {{nome}}, {{nacionalidade}}, {{estado_civil}}, {{profissao}}, RG nº {{rg}}, CPF nº {{cpf}}, residente em {{endereco_completo}}.

CONTRATADO: {{empresa_nome}}.

OBJETO: Prestação de serviços jurídicos relativos a causa de natureza {{area_direito}} - {{tipo_caso_detalhado}}.

CLÁUSULA 1ª — Dos honorários: O(a) CONTRATANTE pagará ao(à) CONTRATADO(A) a título de honorários advocatícios o valor de {{valor_honorarios}}, na forma de pagamento {{forma_pagamento}}.

CLÁUSULA 2ª — Êxito: Em caso de êxito na demanda, será devido adicional de {{percentual_exito}}% sobre o valor obtido.

CLÁUSULA 3ª — Despesas processuais: Custas, emolumentos e demais despesas processuais correrão por conta do(a) CONTRATANTE.

{{cidade_data}}.


_______________________________________      _______________________________________
{{nome}}                                       {{empresa_nome}}
CONTRATANTE                                    CONTRATADO`,
  },
  {
    name: "Declaração de Hipossuficiência",
    category: "declaracao",
    description: "Declaração para gratuidade de justiça",
    content: `DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA

Eu, {{nome}}, {{nacionalidade}}, {{estado_civil}}, {{profissao}}, portador(a) do RG nº {{rg}} e CPF nº {{cpf}}, residente e domiciliado(a) à {{endereco_completo}}, DECLARO, sob as penas da lei, que não disponho de condições financeiras para arcar com as custas processuais e honorários advocatícios sem prejuízo do sustento próprio e de minha família, nos termos do art. 98 do Código de Processo Civil.

Por ser expressão da verdade, firmo a presente.

{{cidade_data}}.


_______________________________________
{{nome}}
CPF: {{cpf}}`,
  },
];
