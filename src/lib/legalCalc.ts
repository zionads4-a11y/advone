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

// ============ PREVIDENCIÁRIA — MODALIDADES ============
export type PrevModalidade =
  | "idade"
  | "tempo_contribuicao"
  | "especial"
  | "invalidez"
  | "auxilio_doenca"
  | "incapacidade_permanente"
  | "planejamento"
  | "revisao_vida_toda"
  | "liquidacao_sentenca";

export interface PrevInput {
  modalidade: PrevModalidade;
  sexo: "M" | "F";
  idade: number;
  tempoContribuicaoAnos: number;
  mediaSalariosContribuicao: number;
  // opcionais por modalidade
  mediaPreJulho94?: number;      // revisão da vida toda
  atrasadosMeses?: number;       // liquidação
  jurosMensalPct?: number;       // liquidação
  correcaoAcumuladaPct?: number; // liquidação
}

export interface PrevResult {
  modalidadeLabel: string;
  coeficiente: number;
  rmi: number;
  rmiComparativa?: number;
  atrasados?: number;
  totalDevido?: number;
  detalhes: { label: string; valor: string }[];
  observacoes: string;
}

const SM_2026 = 1518;
const TETO_INSS = 8157.41;

function clampBenef(v: number) {
  return Math.min(TETO_INSS, Math.max(SM_2026, +v.toFixed(2)));
}

function coefEC103(tempoAnos: number, sexo: "M" | "F") {
  const tempoMin = sexo === "F" ? 15 : 20;
  const excedente = Math.max(0, tempoAnos - tempoMin);
  return { coef: Math.min(1, 0.6 + excedente * 0.02), tempoMin, excedente };
}

export function calcPrevidenciaria(i: PrevInput): PrevResult {
  const media = i.mediaSalariosContribuicao;

  switch (i.modalidade) {
    case "idade": {
      const idadeMin = i.sexo === "F" ? 62 : 65;
      const tempoMin = 15;
      const { coef } = coefEC103(i.tempoContribuicaoAnos, i.sexo);
      const rmi = clampBenef(media * coef);
      const atende = i.idade >= idadeMin && i.tempoContribuicaoAnos >= tempoMin;
      return {
        modalidadeLabel: "Aposentadoria por Idade (EC 103/2019)",
        coeficiente: +(coef * 100).toFixed(2),
        rmi,
        detalhes: [
          { label: "Idade mínima exigida", valor: `${idadeMin} anos` },
          { label: "Idade atual", valor: `${i.idade} anos` },
          { label: "Tempo mínimo de contribuição", valor: `${tempoMin} anos` },
          { label: "Tempo contribuído", valor: `${i.tempoContribuicaoAnos} anos` },
          { label: "Coeficiente (60% + 2%/ano excedente)", valor: `${(coef * 100).toFixed(0)}%` },
          { label: "Média salarial", valor: brl(media) },
          { label: "RMI", valor: brl(rmi) },
          { label: "Status dos requisitos", valor: atende ? "✅ Preenchidos" : "❌ Faltam requisitos" },
        ],
        observacoes:
          "Regra permanente (EC 103/2019, art. 18): 62F/65M + 15 anos de contribuição. Coeficiente = 60% + 2% por ano excedente.",
      };
    }

    case "tempo_contribuicao": {
      // Regra de transição de pontos (EC 103, art. 15). Pontuação 2026: F=91 / M=101.
      const pontosMin = i.sexo === "F" ? 91 : 101;
      const pontos = i.idade + i.tempoContribuicaoAnos;
      const { coef } = coefEC103(i.tempoContribuicaoAnos, i.sexo);
      const rmi = clampBenef(media * coef);
      return {
        modalidadeLabel: "Aposentadoria por Tempo de Contribuição (Transição - Pontos)",
        coeficiente: +(coef * 100).toFixed(2),
        rmi,
        detalhes: [
          { label: "Pontuação mínima 2026", valor: `${pontosMin} pts` },
          { label: "Sua pontuação (idade + tempo)", valor: `${pontos} pts` },
          { label: "Tempo mínimo", valor: i.sexo === "F" ? "30 anos" : "35 anos" },
          { label: "Tempo contribuído", valor: `${i.tempoContribuicaoAnos} anos` },
          { label: "Coeficiente", valor: `${(coef * 100).toFixed(0)}%` },
          { label: "Média salarial", valor: brl(media) },
          { label: "RMI", valor: brl(rmi) },
          { label: "Status", valor: pontos >= pontosMin ? "✅ Atinge pontuação" : `❌ Faltam ${pontosMin - pontos} pts` },
        ],
        observacoes:
          "Regra de transição por pontos (EC 103, art. 15). Pontuação sobe 1 ponto por ano até 100F/105M em 2033.",
      };
    }

    case "especial": {
      // Aposentadoria especial: 25/20/15 anos conforme exposição. Usamos 25 (padrão).
      const tempoMin = 25;
      const { coef } = coefEC103(Math.max(20, i.tempoContribuicaoAnos), i.sexo);
      const rmi = clampBenef(media * coef);
      return {
        modalidadeLabel: "Aposentadoria Especial (atividade insalubre/perigosa)",
        coeficiente: +(coef * 100).toFixed(2),
        rmi,
        detalhes: [
          { label: "Tempo mínimo de exposição", valor: `${tempoMin} anos (grau médio)` },
          { label: "Tempo comprovado", valor: `${i.tempoContribuicaoAnos} anos` },
          { label: "Idade mínima (EC 103)", valor: "55 anos (após 13/11/2019)" },
          { label: "Coeficiente", valor: `${(coef * 100).toFixed(0)}%` },
          { label: "Média salarial", valor: brl(media) },
          { label: "RMI", valor: brl(rmi) },
        ],
        observacoes:
          "Aposentadoria especial (Lei 8.213/91, art. 57). Exige PPP + LTCAT comprovando exposição habitual e permanente a agentes nocivos.",
      };
    }

    case "invalidez":
    case "incapacidade_permanente": {
      // 100% da média (Lei 14.331/2022, EC 103 art. 26 §3º-I) para invalidez decorrente de acidente do trabalho
      // ou doença profissional. Para demais causas: 60% + 2% por ano excedente.
      const { coef } = coefEC103(i.tempoContribuicaoAnos, i.sexo);
      const rmi = clampBenef(media * coef);
      const rmiAcidente = clampBenef(media * 1.0);
      return {
        modalidadeLabel: "Aposentadoria por Incapacidade Permanente (Invalidez)",
        coeficiente: +(coef * 100).toFixed(2),
        rmi,
        rmiComparativa: rmiAcidente,
        detalhes: [
          { label: "Média salarial", valor: brl(media) },
          { label: "Coeficiente doença comum", valor: `${(coef * 100).toFixed(0)}%` },
          { label: "RMI — doença comum", valor: brl(rmi) },
          { label: "Coeficiente acidente/doença ocupacional", valor: "100%" },
          { label: "RMI — se acidentário", valor: brl(rmiAcidente) },
        ],
        observacoes:
          "EC 103/2019 art. 26 §3º-I: incapacidade permanente = 60% + 2%/ano excedente. Se decorrente de acidente do trabalho, doença ocupacional ou profissional: 100% da média (Lei 14.331/22).",
      };
    }

    case "auxilio_doenca": {
      // Auxílio por incapacidade temporária: 91% da média, limitada à média dos últimos 12 salários (Lei 13.135/15)
      const rmi = clampBenef(media * 0.91);
      return {
        modalidadeLabel: "Auxílio por Incapacidade Temporária (Auxílio-Doença)",
        coeficiente: 91,
        rmi,
        detalhes: [
          { label: "Média salarial", valor: brl(media) },
          { label: "Coeficiente", valor: "91%" },
          { label: "Renda mensal do benefício", valor: brl(rmi) },
          { label: "Carência", valor: "12 contribuições (dispensada em acidente)" },
        ],
        observacoes:
          "Lei 8.213/91 art. 61 c/c EC 103 art. 26 §2º-II: 91% da média aritmética dos salários de contribuição, limitada à média dos últimos 12.",
      };
    }

    case "planejamento": {
      // Compara: aposentar hoje x esperar 1, 3 e 5 anos.
      const linhas = [0, 1, 3, 5].map((add) => {
        const t = i.tempoContribuicaoAnos + add;
        const { coef } = coefEC103(t, i.sexo);
        const rmi = clampBenef(media * coef);
        return {
          label: add === 0 ? "Hoje" : `Daqui a ${add} ano${add > 1 ? "s" : ""}`,
          valor: `${brl(rmi)} (coef ${(coef * 100).toFixed(0)}%)`,
        };
      });
      const melhor = coefEC103(i.tempoContribuicaoAnos + 5, i.sexo);
      const rmiMelhor = clampBenef(media * melhor.coef);
      return {
        modalidadeLabel: "Planejamento Previdenciário",
        coeficiente: +(melhor.coef * 100).toFixed(2),
        rmi: rmiMelhor,
        detalhes: [
          { label: "Sexo / Idade", valor: `${i.sexo === "F" ? "Feminino" : "Masculino"} · ${i.idade} anos` },
          { label: "Tempo contribuído hoje", valor: `${i.tempoContribuicaoAnos} anos` },
          { label: "Média salarial", valor: brl(media) },
          ...linhas,
          { label: "Melhor cenário (+5 anos)", valor: brl(rmiMelhor) },
        ],
        observacoes:
          "Simulação comparativa. Para o cenário ótimo, também avalie: descarte das menores contribuições (EC 103 art. 26 §6º), regra 85/95, revisão da vida toda e regime de tributação (IR × contribuições sindicais).",
      };
    }

    case "revisao_vida_toda": {
      // Compara média EC 103 (a partir de 07/1994) com média incluindo TODAS as contribuições.
      const mediaAtual = media;
      const mediaTotal = i.mediaPreJulho94 && i.mediaPreJulho94 > 0
        ? +((mediaAtual + i.mediaPreJulho94) / 2).toFixed(2)
        : mediaAtual * 1.15; // estimativa se não informado
      const { coef } = coefEC103(i.tempoContribuicaoAnos, i.sexo);
      const rmiAtual = clampBenef(mediaAtual * coef);
      const rmiRevisado = clampBenef(mediaTotal * coef);
      const ganhoMensal = +(rmiRevisado - rmiAtual).toFixed(2);
      const ganho60m = +(ganhoMensal * 60).toFixed(2);
      return {
        modalidadeLabel: "Revisão da Vida Toda (Tema 1.102 STF)",
        coeficiente: +(coef * 100).toFixed(2),
        rmi: rmiRevisado,
        rmiComparativa: rmiAtual,
        atrasados: ganho60m,
        detalhes: [
          { label: "Média atual (pós-07/1994)", valor: brl(mediaAtual) },
          { label: "Média incluindo contribuições anteriores", valor: brl(mediaTotal) },
          { label: "Coeficiente", valor: `${(coef * 100).toFixed(0)}%` },
          { label: "RMI atual", valor: brl(rmiAtual) },
          { label: "RMI revisada", valor: brl(rmiRevisado) },
          { label: "Ganho mensal", valor: brl(ganhoMensal) },
          { label: "Atrasados (60 meses)", valor: brl(ganho60m) },
        ],
        observacoes:
          "STF Tema 1.102 (RE 1.276.977): direito à opção pela regra do art. 29 da Lei 8.213/91 (média de toda a vida contributiva) quando mais benéfica. Atenção ao julgamento do STF em 2024 sobre modulação de efeitos.",
      };
    }

    case "liquidacao_sentenca": {
      // Liquidação de sentença: RMI × meses atrasados + juros + correção
      const { coef } = coefEC103(i.tempoContribuicaoAnos, i.sexo);
      const rmi = clampBenef(media * coef);
      const meses = i.atrasadosMeses ?? 0;
      const bruto = +(rmi * meses).toFixed(2);
      const juros = +(bruto * ((i.jurosMensalPct ?? 0.5) / 100) * (meses / 2)).toFixed(2);
      const correcao = +(bruto * ((i.correcaoAcumuladaPct ?? 0) / 100)).toFixed(2);
      const total = +(bruto + juros + correcao).toFixed(2);
      return {
        modalidadeLabel: "Liquidação de Sentença Previdenciária",
        coeficiente: +(coef * 100).toFixed(2),
        rmi,
        atrasados: bruto,
        totalDevido: total,
        detalhes: [
          { label: "RMI apurada", valor: brl(rmi) },
          { label: "Meses em atraso", valor: `${meses}` },
          { label: "Atrasados (RMI × meses)", valor: brl(bruto) },
          { label: `Juros de mora (${i.jurosMensalPct ?? 0.5}% a.m., Selic)`, valor: brl(juros) },
          { label: `Correção monetária (${i.correcaoAcumuladaPct ?? 0}%)`, valor: brl(correcao) },
          { label: "TOTAL A EXECUTAR", valor: brl(total) },
        ],
        observacoes:
          "Após EC 113/2021: juros e correção pela Selic (índice único). Antes: TR + 1% a.m. Aplicar conforme período de cada parcela vencida.",
      };
    }
  }
}

// Wrapper legado (mantém compatibilidade com quem importa calcRMI)
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
  const r = calcPrevidenciaria({
    modalidade: i.regra === "EC103_idade" ? "idade" : "tempo_contribuicao",
    sexo: i.sexo,
    idade: i.idade ?? 0,
    tempoContribuicaoAnos: i.tempoContribuicaoAnos,
    mediaSalariosContribuicao: i.mediaSalariosContribuicao,
  });
  return { coeficiente: r.coeficiente, rmi: r.rmi, detalhes: r.detalhes, observacoes: r.observacoes };
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
