// Cálculos jurídicos — fórmulas oficiais brasileiras (simplificadas)
// Todos os valores em Reais. Retornam objetos com breakdown detalhado.

const brl = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ============ TRABALHISTA — RESCISÃO ============
export interface RescisaoInput {
  salarioBruto: number;
  admissao: string; // YYYY-MM-DD
  demissao: string; // YYYY-MM-DD
  motivo: "sem_justa_causa" | "pedido_demissao" | "justa_causa" | "acordo";
  avisoTrabalhado: boolean;
  feriasVencidas: boolean;
  saldoFgts: number; // saldo depositado
  mediaHorasExtrasMes?: number;
  adicionalPct?: number; // insalubridade/periculosidade %
}

export interface RescisaoResult {
  itens: { label: string; valor: number; formula: string }[];
  totalBruto: number;
  fgtsDeposito: number;
  multaFgts: number;
  totalReceber: number;
}

function diffMonths(d1: Date, d2: Date) {
  const years = d2.getFullYear() - d1.getFullYear();
  const months = d2.getMonth() - d1.getMonth();
  const days = d2.getDate() - d1.getDate();
  let total = years * 12 + months;
  if (days >= 15) total += 1; // fração ≥15 dias conta mês (súmula 45 TST p/ 13º e férias)
  return Math.max(0, total);
}

export function calcRescisao(i: RescisaoInput): RescisaoResult {
  const admissao = new Date(i.admissao + "T12:00:00");
  const demissao = new Date(i.demissao + "T12:00:00");
  const salario = Number(i.salarioBruto) || 0;
  const salarioDia = salario / 30;
  const salarioHora = salario / 220;

  const anosTrab = Math.floor(
    (demissao.getTime() - admissao.getTime()) / (365.25 * 24 * 3600 * 1000),
  );

  // Saldo de salário — dias trabalhados no mês da demissão
  const diasNoMes = demissao.getDate();
  const saldoSalario = +(salarioDia * diasNoMes).toFixed(2);

  // Aviso prévio (Lei 12.506/2011: 30 dias + 3 por ano, máx 90)
  const diasAviso = Math.min(90, 30 + anosTrab * 3);
  const avisoIndenizado =
    !i.avisoTrabalhado && (i.motivo === "sem_justa_causa" || i.motivo === "acordo")
      ? +(salarioDia * diasAviso).toFixed(2)
      : 0;

  // 13º proporcional (meses trabalhados no ano da demissão)
  const inicioAno = new Date(demissao.getFullYear(), 0, 1);
  const mesesAno = diffMonths(admissao > inicioAno ? admissao : inicioAno, demissao);
  const decimoTerceiro =
    i.motivo !== "justa_causa" ? +((salario * mesesAno) / 12).toFixed(2) : 0;

  // Férias proporcionais + 1/3
  const mesesAquisitivo = diffMonths(admissao, demissao) % 12 || 12;
  const feriasProp =
    i.motivo !== "justa_causa"
      ? +(((salario * mesesAquisitivo) / 12) * (4 / 3)).toFixed(2)
      : 0;

  // Férias vencidas + 1/3
  const feriasVenc = i.feriasVencidas ? +(salario * (4 / 3)).toFixed(2) : 0;

  // Horas extras (média × meses trabalhados) — simplificado: paga só as do último mês
  const horasExtras = i.mediaHorasExtrasMes
    ? +(salarioHora * i.mediaHorasExtrasMes * 1.5).toFixed(2)
    : 0;

  // Adicional insalubridade/periculosidade sobre salário mínimo (R$1.518 em 2026)
  const salMin = 1518;
  const adicional = i.adicionalPct
    ? +(salMin * (i.adicionalPct / 100)).toFixed(2)
    : 0;

  // FGTS do mês (8%) + multa 40%
  const fgtsMes = +(salario * 0.08).toFixed(2);
  const multaFgts =
    i.motivo === "sem_justa_causa"
      ? +(i.saldoFgts * 0.4).toFixed(2)
      : i.motivo === "acordo"
        ? +(i.saldoFgts * 0.2).toFixed(2)
        : 0;

  const itens = [
    { label: "Saldo de salário", valor: saldoSalario, formula: `${brl(salarioDia)} × ${diasNoMes} dias` },
    { label: `Aviso prévio indenizado (${diasAviso} dias)`, valor: avisoIndenizado, formula: `${brl(salarioDia)} × ${diasAviso}` },
    { label: `13º proporcional (${mesesAno}/12)`, valor: decimoTerceiro, formula: `${brl(salario)} × ${mesesAno}/12` },
    { label: `Férias proporcionais + 1/3 (${mesesAquisitivo}/12)`, valor: feriasProp, formula: `${brl(salario)} × ${mesesAquisitivo}/12 × 4/3` },
    { label: "Férias vencidas + 1/3", valor: feriasVenc, formula: `${brl(salario)} × 4/3` },
    { label: "Horas extras (50%)", valor: horasExtras, formula: `${brl(salarioHora)}/h × ${i.mediaHorasExtrasMes ?? 0} × 1,5` },
    { label: `Adicional (${i.adicionalPct ?? 0}%)`, valor: adicional, formula: `SM ${brl(salMin)} × ${i.adicionalPct ?? 0}%` },
    { label: "FGTS do mês (8%)", valor: fgtsMes, formula: `${brl(salario)} × 8%` },
  ].filter((x) => x.valor > 0);

  const totalBruto = +itens.reduce((s, x) => s + x.valor, 0).toFixed(2);
  const totalReceber = +(totalBruto + multaFgts).toFixed(2);

  return { itens, totalBruto, fgtsDeposito: fgtsMes, multaFgts, totalReceber };
}

// ============ PREVIDENCIÁRIA — RMI SIMPLIFICADA ============
export interface RMIInput {
  sexo: "M" | "F";
  tempoContribuicaoAnos: number;
  mediaSalariosContribuicao: number;
  regra: "EC103_pontos" | "EC103_idade" | "media_geral";
  idade?: number;
}

export interface RMIResult {
  coeficiente: number;
  rmi: number;
  detalhes: { label: string; valor: string }[];
  observacoes: string;
}

export function calcRMI(i: RMIInput): RMIResult {
  const tempoMin = i.sexo === "F" ? 15 : 20;
  const excedente = Math.max(0, i.tempoContribuicaoAnos - tempoMin);
  const coeficiente = Math.min(1, 0.6 + excedente * 0.02);
  const rmi = +(i.mediaSalariosContribuicao * coeficiente).toFixed(2);
  const salMin = 1518;
  const teto = 8157.41; // teto INSS 2025
  const rmiFinal = Math.min(teto, Math.max(salMin, rmi));

  return {
    coeficiente: +(coeficiente * 100).toFixed(2),
    rmi: rmiFinal,
    detalhes: [
      { label: "Tempo mínimo exigido", valor: `${tempoMin} anos` },
      { label: "Tempo contribuído", valor: `${i.tempoContribuicaoAnos} anos` },
      { label: "Excedente sobre o mínimo", valor: `${excedente} anos` },
      { label: "Coeficiente (60% + 2%/ano)", valor: `${(coeficiente * 100).toFixed(0)}%` },
      { label: "Média salários de contribuição", valor: brl(i.mediaSalariosContribuicao) },
      { label: "RMI calculada", valor: brl(rmi) },
      { label: "RMI após pisos (SM/teto)", valor: brl(rmiFinal) },
    ],
    observacoes:
      "Cálculo aplica a fórmula da EC 103/2019 (art. 26): 60% da média + 2% por ano de contribuição excedente ao mínimo (15/20 anos). Verifique regras de transição aplicáveis ao caso concreto.",
  };
}

// ============ PENSÃO ALIMENTÍCIA ============
export interface PensaoInput {
  baseCalculo: number; // salário líquido/bruto do alimentante
  percentual: number; // %
  mesesAtrasados: number;
  jurosMensalPct: number; // ex 1% a.m.
  correcaoAcumuladaPct: number; // ex 4% no período (IPCA)
}

export interface PensaoResult {
  valorMensal: number;
  totalAtrasado: number;
  juros: number;
  correcao: number;
  totalDevido: number;
  detalhes: { label: string; valor: string }[];
}

export function calcPensao(i: PensaoInput): PensaoResult {
  const valorMensal = +((i.baseCalculo * i.percentual) / 100).toFixed(2);
  const totalAtrasado = +(valorMensal * i.mesesAtrasados).toFixed(2);
  // Juros simples: 1% × meses/2 (média sobre parcelas mensais)
  const juros = +(totalAtrasado * (i.jurosMensalPct / 100) * (i.mesesAtrasados / 2)).toFixed(2);
  const correcao = +(totalAtrasado * (i.correcaoAcumuladaPct / 100)).toFixed(2);
  const totalDevido = +(totalAtrasado + juros + correcao).toFixed(2);

  return {
    valorMensal,
    totalAtrasado,
    juros,
    correcao,
    totalDevido,
    detalhes: [
      { label: "Base de cálculo", valor: brl(i.baseCalculo) },
      { label: "Percentual", valor: `${i.percentual}%` },
      { label: "Prestação mensal", valor: brl(valorMensal) },
      { label: `Atrasado (${i.mesesAtrasados} meses)`, valor: brl(totalAtrasado) },
      { label: `Juros (${i.jurosMensalPct}% a.m. simples)`, valor: brl(juros) },
      { label: `Correção monetária (${i.correcaoAcumuladaPct}% no período)`, valor: brl(correcao) },
      { label: "Total devido", valor: brl(totalDevido) },
    ],
  };
}

// ============ REVISIONAL DE FINANCIAMENTO ============
export interface RevisionalInput {
  valorFinanciado: number;
  prazoMeses: number;
  taxaContratadaMensal: number; // %
  taxaMediaBacenMensal: number; // %
  parcelaContratual: number;
}

export interface RevisionalResult {
  parcelaPrice: number;
  parcelaJusta: number;
  totalPagoContratado: number;
  totalPagoJusto: number;
  excessoMensal: number;
  excessoTotal: number;
  indiceAbusividade: number;
  abusivo: boolean;
  detalhes: { label: string; valor: string }[];
}

function parcelaPrice(pv: number, i: number, n: number) {
  if (i === 0) return pv / n;
  const r = i / 100;
  return (pv * r) / (1 - Math.pow(1 + r, -n));
}

export function calcRevisional(i: RevisionalInput): RevisionalResult {
  const parcelaPriceCalc = +parcelaPrice(i.valorFinanciado, i.taxaContratadaMensal, i.prazoMeses).toFixed(2);
  const parcelaJusta = +parcelaPrice(i.valorFinanciado, i.taxaMediaBacenMensal, i.prazoMeses).toFixed(2);
  const totalPagoContratado = +(i.parcelaContratual * i.prazoMeses).toFixed(2);
  const totalPagoJusto = +(parcelaJusta * i.prazoMeses).toFixed(2);
  const excessoMensal = +(i.parcelaContratual - parcelaJusta).toFixed(2);
  const excessoTotal = +(totalPagoContratado - totalPagoJusto).toFixed(2);
  const indice = +(i.taxaContratadaMensal / (i.taxaMediaBacenMensal || 0.01)).toFixed(2);
  // STJ REsp 1.061.530: abusividade quando taxa contratada > 1,5× média do mercado
  const abusivo = indice > 1.5;

  return {
    parcelaPrice: parcelaPriceCalc,
    parcelaJusta,
    totalPagoContratado,
    totalPagoJusto,
    excessoMensal,
    excessoTotal,
    indiceAbusividade: indice,
    abusivo,
    detalhes: [
      { label: "Valor financiado", valor: brl(i.valorFinanciado) },
      { label: "Prazo", valor: `${i.prazoMeses} meses` },
      { label: "Taxa contratada", valor: `${i.taxaContratadaMensal}% a.m.` },
      { label: "Taxa média Bacen", valor: `${i.taxaMediaBacenMensal}% a.m.` },
      { label: "Parcela contratual paga", valor: brl(i.parcelaContratual) },
      { label: "Parcela recalculada (Price c/ taxa contratada)", valor: brl(parcelaPriceCalc) },
      { label: "Parcela justa (taxa Bacen)", valor: brl(parcelaJusta) },
      { label: "Excesso por parcela", valor: brl(excessoMensal) },
      { label: "Excesso total do contrato", valor: brl(excessoTotal) },
      { label: "Índice de abusividade (contratada / Bacen)", valor: `${indice}x` },
      { label: "Diagnóstico STJ REsp 1.061.530", valor: abusivo ? "ABUSIVA (>1,5× média)" : "Dentro do padrão de mercado" },
    ],
  };
}

export { brl };
