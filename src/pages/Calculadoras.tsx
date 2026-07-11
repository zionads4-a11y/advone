import { useState } from "react";
import { Calculator, Loader2, Sparkles, Briefcase, Landmark, HeartHandshake, Banknote, ShieldAlert, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  brl,
  calcRescisao,
  calcPrevidenciaria,
  calcPensao,
  calcRevisional,
  calcSuperendividamento,
  type RescisaoResult,
  type PrevResult,
  type PrevModalidade,
  type PensaoResult,
  type RevisionalResult,
  type SuperendividamentoResult,
  type CategoriaDevedor,
  type TipoContrato,
  type DividaItem,
} from "@/lib/legalCalc";

type CalcTipo = "trabalhista" | "previdenciaria" | "pensao" | "revisional" | "superendividamento";


interface ResultBlockProps {
  itens: { label: string; valor?: string | number; formula?: string }[];
  destaques?: { label: string; valor: string; highlight?: boolean }[];
}

function ResultBlock({ itens, destaques }: ResultBlockProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Detalhamento
        </h4>
        <div className="space-y-1.5 text-sm">
          {itens.map((it, i) => (
            <div key={i} className="flex items-start justify-between gap-3 border-b border-border/40 pb-1 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{it.label}</p>
                {it.formula && <p className="text-[11px] text-muted-foreground">{it.formula}</p>}
              </div>
              <p className="shrink-0 font-mono text-sm font-semibold">
                {typeof it.valor === "number" ? brl(it.valor) : it.valor}
              </p>
            </div>
          ))}
        </div>
      </div>
      {destaques && destaques.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {destaques.map((d, i) => (
            <div
              key={i}
              className={`rounded-md border p-3 ${
                d.highlight
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{d.label}</p>
              <p className={`mt-1 text-xl font-bold ${d.highlight ? "text-primary" : ""}`}>
                {d.valor}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Calculadoras() {
  const [tab, setTab] = useState<CalcTipo>("trabalhista");

  // ===== Trabalhista =====
  const [resc, setResc] = useState({
    salarioBruto: 3000,
    admissao: "2022-01-10",
    demissao: new Date().toISOString().slice(0, 10),
    motivo: "sem_justa_causa" as const,
    avisoTrabalhado: false,
    feriasVencidas: false,
    saldoFgts: 15000,
    mediaHorasExtrasMes: 0,
    adicionalPct: 0,
  });
  const [rescResult, setRescResult] = useState<RescisaoResult | null>(null);

  // ===== Previdenciária =====
  const [rmi, setRmi] = useState({
    modalidade: "idade" as PrevModalidade,
    sexo: "M" as "M" | "F",
    tempoContribuicaoAnos: 25,
    mediaSalariosContribuicao: 3500,
    idade: 65,
    mediaPreJulho94: 0,
    atrasadosMeses: 24,
    jurosMensalPct: 0.5,
    correcaoAcumuladaPct: 8,
  });
  const [rmiResult, setRmiResult] = useState<PrevResult | null>(null);

  // ===== Pensão =====
  const [pen, setPen] = useState({
    baseCalculo: 4000,
    percentual: 30,
    mesesAtrasados: 6,
    jurosMensalPct: 1,
    correcaoAcumuladaPct: 4,
  });
  const [penResult, setPenResult] = useState<PensaoResult | null>(null);

  // ===== Revisional =====
  const [rev, setRev] = useState({
    valorFinanciado: 50000,
    prazoMeses: 60,
    taxaContratadaMensal: 3.5,
    taxaMediaBacenMensal: 1.8,
    parcelaContratual: 1650,
  });
  const [revResult, setRevResult] = useState<RevisionalResult | null>(null);

  // ===== Superendividamento =====
  const [sup, setSup] = useState({
    categoria: "servidor_publico" as CategoriaDevedor,
    rendaLiquidaMensal: 6000,
    outrasRendasMensais: 0,
    dependentes: 1,
    prazoRepactuacaoMeses: 60,
    dividas: [
      { credor: "Banco X", tipo: "consignado" as TipoContrato, parcelaMensal: 1200, saldoDevedor: 35000, taxaMensalPct: 1.9, parcelasRestantes: 40 },
      { credor: "Cartão RMC", tipo: "cartao_rmc" as TipoContrato, parcelaMensal: 300, saldoDevedor: 8000, taxaMensalPct: 3.5, parcelasRestantes: 0 },
      { credor: "Empréstimo pessoal", tipo: "emprestimo_pessoal" as TipoContrato, parcelaMensal: 850, saldoDevedor: 20000, taxaMensalPct: 5.9, parcelasRestantes: 30 },
    ] as DividaItem[],
  });
  const [supResult, setSupResult] = useState<SuperendividamentoResult | null>(null);

    taxaContratadaMensal: 3.5,
    taxaMediaBacenMensal: 1.8,
    parcelaContratual: 1650,
  });
  const [revResult, setRevResult] = useState<RevisionalResult | null>(null);

  // ===== IA parecer =====
  const [aiLoading, setAiLoading] = useState(false);
  const [parecer, setParecer] = useState("");

  const gerarParecer = async (tipo: CalcTipo, inputs: any, resultado: any) => {
    setAiLoading(true);
    setParecer("");
    try {
      const { data, error } = await supabase.functions.invoke("legal-calculator-explain", {
        body: {
          tipo:
            tipo === "trabalhista"
              ? "Rescisão Trabalhista"
              : tipo === "previdenciaria"
                ? "Aposentadoria (RMI - EC 103/2019)"
                : tipo === "pensao"
                  ? "Pensão Alimentícia com atrasados"
                  : "Revisional de Financiamento Bancário",
          inputs,
          resultado,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setParecer((data as any).parecer ?? "");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar parecer",
        description: e?.message ?? "Tente novamente.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const executarTrabalhista = () => {
    const r = calcRescisao(resc);
    setRescResult(r);
    setParecer("");
    gerarParecer("trabalhista", resc, r);
  };
  const executarRMI = () => {
    const r = calcPrevidenciaria(rmi);
    setRmiResult(r);
    setParecer("");
    gerarParecer("previdenciaria", rmi, r);
  };
  const executarPensao = () => {
    const r = calcPensao(pen);
    setPenResult(r);
    setParecer("");
    gerarParecer("pensao", pen, r);
  };
  const executarRev = () => {
    const r = calcRevisional(rev);
    setRevResult(r);
    setParecer("");
    gerarParecer("revisional", rev, r);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              AdvCalc — Calculadoras Jurídicas
              <Badge className="border-accent/30 bg-accent/15 text-[10px] uppercase text-accent">
                Fórmulas oficiais + IA
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Trabalhista, Previdenciária, Pensão e Revisional com memória de cálculo pronta para petição
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CalcTipo)} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="trabalhista" className="gap-2">
            <Briefcase className="h-4 w-4" /> Trabalhista
          </TabsTrigger>
          <TabsTrigger value="previdenciaria" className="gap-2">
            <Landmark className="h-4 w-4" /> Previdenciária
          </TabsTrigger>
          <TabsTrigger value="pensao" className="gap-2">
            <HeartHandshake className="h-4 w-4" /> Pensão
          </TabsTrigger>
          <TabsTrigger value="revisional" className="gap-2">
            <Banknote className="h-4 w-4" /> Revisional
          </TabsTrigger>
        </TabsList>

        <div className="mt-3 grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Formulário */}
          <Card className="flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-5">
                {/* ===== TRABALHISTA ===== */}
                <TabsContent value="trabalhista" className="m-0 space-y-3">
                  <h2 className="text-sm font-semibold">Rescisão Trabalhista</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Salário bruto (R$)</Label>
                      <Input type="number" value={resc.salarioBruto}
                        onChange={(e) => setResc({ ...resc, salarioBruto: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Admissão</Label>
                      <Input type="date" value={resc.admissao}
                        onChange={(e) => setResc({ ...resc, admissao: e.target.value })} />
                    </div>
                    <div>
                      <Label>Demissão</Label>
                      <Input type="date" value={resc.demissao}
                        onChange={(e) => setResc({ ...resc, demissao: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Motivo</Label>
                      <Select value={resc.motivo} onValueChange={(v: any) => setResc({ ...resc, motivo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sem_justa_causa">Sem justa causa</SelectItem>
                          <SelectItem value="pedido_demissao">Pedido de demissão</SelectItem>
                          <SelectItem value="justa_causa">Justa causa</SelectItem>
                          <SelectItem value="acordo">Acordo (Lei 13.467/17)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Saldo FGTS (R$)</Label>
                      <Input type="number" value={resc.saldoFgts}
                        onChange={(e) => setResc({ ...resc, saldoFgts: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Média horas extras/mês</Label>
                      <Input type="number" value={resc.mediaHorasExtrasMes}
                        onChange={(e) => setResc({ ...resc, mediaHorasExtrasMes: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Adicional (%)</Label>
                      <Input type="number" value={resc.adicionalPct}
                        onChange={(e) => setResc({ ...resc, adicionalPct: +e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Checkbox id="aviso" checked={resc.avisoTrabalhado}
                        onCheckedChange={(v) => setResc({ ...resc, avisoTrabalhado: !!v })} />
                      <Label htmlFor="aviso" className="cursor-pointer text-xs">Aviso trabalhado</Label>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Checkbox id="fer" checked={resc.feriasVencidas}
                        onCheckedChange={(v) => setResc({ ...resc, feriasVencidas: !!v })} />
                      <Label htmlFor="fer" className="cursor-pointer text-xs">Possui férias vencidas</Label>
                    </div>
                  </div>
                  <Button onClick={executarTrabalhista} className="w-full">
                    <Calculator className="mr-2 h-4 w-4" /> Calcular rescisão
                  </Button>
                  {rescResult && (
                    <>
                      <Separator />
                      <ResultBlock
                        itens={rescResult.itens.map((x) => ({ label: x.label, valor: x.valor, formula: x.formula }))}
                        destaques={[
                          { label: "Total das verbas", valor: brl(rescResult.totalBruto) },
                          { label: "Multa 40% FGTS", valor: brl(rescResult.multaFgts) },
                          { label: "TOTAL A RECEBER", valor: brl(rescResult.totalReceber), highlight: true },
                        ]}
                      />
                    </>
                  )}
                </TabsContent>

                {/* ===== PREVIDENCIÁRIA ===== */}
                <TabsContent value="previdenciaria" className="m-0 space-y-3">
                  <h2 className="text-sm font-semibold">Calculadoras Previdenciárias (INSS)</h2>

                  <div>
                    <Label>Modalidade do benefício</Label>
                    <Select
                      value={rmi.modalidade}
                      onValueChange={(v: PrevModalidade) => setRmi({ ...rmi, modalidade: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idade">Aposentadoria por Idade</SelectItem>
                        <SelectItem value="tempo_contribuicao">Aposentadoria por Tempo de Contribuição</SelectItem>
                        <SelectItem value="especial">Aposentadoria Especial (insalubre/perigosa)</SelectItem>
                        <SelectItem value="invalidez">Aposentadoria por Invalidez</SelectItem>
                        <SelectItem value="incapacidade_permanente">Incapacidade Permanente</SelectItem>
                        <SelectItem value="auxilio_doenca">Auxílio-Doença (Incapacidade Temporária)</SelectItem>
                        <SelectItem value="planejamento">Planejamento Previdenciário</SelectItem>
                        <SelectItem value="revisao_vida_toda">Revisão da Vida Toda (Tema 1.102 STF)</SelectItem>
                        <SelectItem value="liquidacao_sentenca">Liquidação de Sentença</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Sexo</Label>
                      <Select value={rmi.sexo} onValueChange={(v: any) => setRmi({ ...rmi, sexo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Idade atual</Label>
                      <Input type="number" value={rmi.idade}
                        onChange={(e) => setRmi({ ...rmi, idade: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Tempo de contribuição (anos)</Label>
                      <Input type="number" value={rmi.tempoContribuicaoAnos}
                        onChange={(e) => setRmi({ ...rmi, tempoContribuicaoAnos: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Média salários pós 07/1994 (R$)</Label>
                      <Input type="number" value={rmi.mediaSalariosContribuicao}
                        onChange={(e) => setRmi({ ...rmi, mediaSalariosContribuicao: +e.target.value })} />
                    </div>

                    {rmi.modalidade === "revisao_vida_toda" && (
                      <div className="col-span-2">
                        <Label>Média salários antes de 07/1994 (R$)</Label>
                        <Input type="number" value={rmi.mediaPreJulho94}
                          onChange={(e) => setRmi({ ...rmi, mediaPreJulho94: +e.target.value })} />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Deixe 0 para simular estimativa automática de 15% de ganho.
                        </p>
                      </div>
                    )}

                    {rmi.modalidade === "liquidacao_sentenca" && (
                      <>
                        <div>
                          <Label>Meses atrasados</Label>
                          <Input type="number" value={rmi.atrasadosMeses}
                            onChange={(e) => setRmi({ ...rmi, atrasadosMeses: +e.target.value })} />
                        </div>
                        <div>
                          <Label>Juros mensais Selic (%)</Label>
                          <Input type="number" step="0.01" value={rmi.jurosMensalPct}
                            onChange={(e) => setRmi({ ...rmi, jurosMensalPct: +e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <Label>Correção acumulada no período (%)</Label>
                          <Input type="number" step="0.1" value={rmi.correcaoAcumuladaPct}
                            onChange={(e) => setRmi({ ...rmi, correcaoAcumuladaPct: +e.target.value })} />
                        </div>
                      </>
                    )}
                  </div>

                  <Button onClick={executarRMI} className="w-full">
                    <Calculator className="mr-2 h-4 w-4" /> Calcular benefício
                  </Button>

                  {rmiResult && (
                    <>
                      <Separator />
                      <p className="text-xs font-semibold text-primary">{rmiResult.modalidadeLabel}</p>
                      <ResultBlock
                        itens={rmiResult.detalhes.map((x) => ({ label: x.label, valor: x.valor }))}
                        destaques={[
                          { label: "Coeficiente aplicado", valor: `${rmiResult.coeficiente}%` },
                          { label: "RENDA MENSAL INICIAL", valor: brl(rmiResult.rmi), highlight: true },
                          ...(rmiResult.atrasados
                            ? [{ label: "Atrasados apurados", valor: brl(rmiResult.atrasados) }]
                            : []),
                          ...(rmiResult.totalDevido
                            ? [{ label: "TOTAL DEVIDO", valor: brl(rmiResult.totalDevido), highlight: true }]
                            : []),
                        ]}
                      />
                      <p className="text-[11px] italic text-muted-foreground">{rmiResult.observacoes}</p>
                    </>
                  )}
                </TabsContent>


                {/* ===== PENSÃO ===== */}
                <TabsContent value="pensao" className="m-0 space-y-3">
                  <h2 className="text-sm font-semibold">Pensão Alimentícia</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Base de cálculo (R$)</Label>
                      <Input type="number" value={pen.baseCalculo}
                        onChange={(e) => setPen({ ...pen, baseCalculo: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Percentual (%)</Label>
                      <Input type="number" value={pen.percentual}
                        onChange={(e) => setPen({ ...pen, percentual: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Meses em atraso</Label>
                      <Input type="number" value={pen.mesesAtrasados}
                        onChange={(e) => setPen({ ...pen, mesesAtrasados: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Juros mensais (%)</Label>
                      <Input type="number" step="0.1" value={pen.jurosMensalPct}
                        onChange={(e) => setPen({ ...pen, jurosMensalPct: +e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Correção acumulada no período (%)</Label>
                      <Input type="number" step="0.1" value={pen.correcaoAcumuladaPct}
                        onChange={(e) => setPen({ ...pen, correcaoAcumuladaPct: +e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={executarPensao} className="w-full">
                    <Calculator className="mr-2 h-4 w-4" /> Calcular pensão + atrasados
                  </Button>
                  {penResult && (
                    <>
                      <Separator />
                      <ResultBlock
                        itens={penResult.detalhes.map((x) => ({ label: x.label, valor: x.valor }))}
                        destaques={[
                          { label: "Prestação mensal", valor: brl(penResult.valorMensal) },
                          { label: "TOTAL DEVIDO", valor: brl(penResult.totalDevido), highlight: true },
                        ]}
                      />
                    </>
                  )}
                </TabsContent>

                {/* ===== REVISIONAL ===== */}
                <TabsContent value="revisional" className="m-0 space-y-3">
                  <h2 className="text-sm font-semibold">Revisional de Financiamento</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor financiado (R$)</Label>
                      <Input type="number" value={rev.valorFinanciado}
                        onChange={(e) => setRev({ ...rev, valorFinanciado: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Prazo (meses)</Label>
                      <Input type="number" value={rev.prazoMeses}
                        onChange={(e) => setRev({ ...rev, prazoMeses: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Taxa contratada (% a.m.)</Label>
                      <Input type="number" step="0.01" value={rev.taxaContratadaMensal}
                        onChange={(e) => setRev({ ...rev, taxaContratadaMensal: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Taxa média Bacen (% a.m.)</Label>
                      <Input type="number" step="0.01" value={rev.taxaMediaBacenMensal}
                        onChange={(e) => setRev({ ...rev, taxaMediaBacenMensal: +e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Parcela paga no contrato (R$)</Label>
                      <Input type="number" value={rev.parcelaContratual}
                        onChange={(e) => setRev({ ...rev, parcelaContratual: +e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={executarRev} className="w-full">
                    <Calculator className="mr-2 h-4 w-4" /> Analisar abusividade
                  </Button>
                  {revResult && (
                    <>
                      <Separator />
                      <ResultBlock
                        itens={revResult.detalhes.map((x) => ({ label: x.label, valor: x.valor }))}
                        destaques={[
                          { label: "Excesso por parcela", valor: brl(revResult.excessoMensal) },
                          {
                            label: revResult.abusivo ? "CONTRATO ABUSIVO — recuperável" : "Contrato dentro do padrão",
                            valor: brl(revResult.excessoTotal),
                            highlight: revResult.abusivo,
                          },
                        ]}
                      />
                    </>
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Card>

          {/* Parecer IA */}
          <Card className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b p-3">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Parecer Jurídico + Memória de Cálculo
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-5">
                {aiLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Gerando parecer técnico com fundamentação legal...
                    </p>
                  </div>
                )}
                {!aiLoading && !parecer && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Calculator className="h-10 w-10 text-accent" />
                    <h2 className="text-base font-semibold">Preencha os dados e calcule</h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Após o cálculo, a IA jurídica produz automaticamente a memória de cálculo detalhada e o parecer com fundamentação legal, pronto para anexar à sua petição.
                    </p>
                  </div>
                )}
                {!aiLoading && parecer && (
                  <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{parecer}</ReactMarkdown>
                  </article>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
