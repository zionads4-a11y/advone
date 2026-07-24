import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Copy, DollarSign, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Cycle = { label: string; monthly: number; total?: number; highlight?: boolean; note?: string };
type Plan = {
  key: string;
  name: string;
  tagline: string;
  color: string;
  cycles: Cycle[];
  features: string[];
  quotaMsg: string;
  bestFor: string;
};

const PLANS: Plan[] = [
  {
    key: "ia",
    name: "AdvOne IA",
    tagline: "Sua secretária virtual 24h no WhatsApp",
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/30",
    quotaMsg: "15.000 mensagens/mês da Laura",
    bestFor: "Advogados solo e escritórios de pequeno/médio porte que perdem lead no WhatsApp.",
    cycles: [
      { label: "Mensal", monthly: 897 },
      { label: "Semestral", monthly: 797, total: 4782, note: "Economia de R$ 600 no período" },
      { label: "Anual", monthly: 597, total: 7164, highlight: true, note: "Melhor oferta · economia de R$ 3.600/ano" },
    ],
    features: [
      "Atendimento no WhatsApp 24h com IA Laura",
      "Qualificação inteligente de leads por nicho",
      "Agendamento automático (Google Calendar)",
      "Follow-up automático (5 tentativas)",
      "Transcrição de áudio + leitura de imagens",
      "Atendimento a clientes atuais",
      "Kanban de leads (9 estágios)",
      "Dashboard e relatórios básicos",
    ],
  },
  {
    key: "enterprise",
    name: "AdvOne Enterprise",
    tagline: "Central de relacionamento para escritórios grandes",
    color: "from-amber-500/10 to-amber-500/5 border-amber-500/30",
    quotaMsg: "Mensagens ilimitadas",
    bestFor: "Escritórios com 4+ áreas de atuação, equipe grande e centenas de clientes ativos.",
    cycles: [
      { label: "Sob medida", monthly: 0, note: "Valor definido pelo consultor conforme escopo" },
    ],
    features: [
      "Tudo do AdvOne IA incluso",
      "Áreas de atuação ilimitadas (a partir de 4)",
      "Equipe ilimitada por área",
      "Atendimento a clientes no mesmo número da captação",
      "Identificação automática (nome + CPF)",
      "Roteamento por área (Trabalhista, Cível, Previdenciário...)",
      "Sala de conversa por departamento",
      "Transferência entre setores/advogados com auditoria",
      "Consulta de status de processo no WhatsApp",
      "SLA dedicado + onboarding assistido",
      "LGPD/compliance: histórico auditável + download",
    ],
  },
];

const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: "Por que R$ 897 mensal se anual é R$ 597?",
    a: "Anual paga adiantado (R$ 7.164 de uma vez). Mensal tem flexibilidade de cancelar quando quiser. Semestral (R$ 797) é o meio-termo. Cada ciclo tem seu público — vender pelo cash flow do cliente.",
  },
  {
    q: "Cliente pergunta se tem plano mais barato",
    a: "NÃO temos plano abaixo de R$ 597/mês. Se o cliente resistir, ofereça o anual (menor mensalidade) ou entenda a real dor — normalmente não é preço, é medo de não funcionar. Ofereça garantia de 7 dias.",
  },
  {
    q: "Cliente quer descontar mais do anual",
    a: "Margem no anual já está apertada. Nunca desça de R$ 497/mês no anual sem autorização. Prefira agregar valor: onboarding VIP, setup de fluxos personalizados, migração de dados.",
  },
  {
    q: "Escritório com mais de 3 advogados",
    a: "AdvOne IA aguenta até 3 advogados/área. Acima disso, obrigatório subir para Enterprise (sob medida). Não vender IA para escritório grande — vai reclamar de limite.",
  },
  {
    q: "Cliente pede prazo de teste grátis",
    a: "Oferecemos garantia de 7 dias após ativação. Não temos trial antes do pagamento — configuração personalizada demora 24h e envolve custo de setup.",
  },
];

const UPSELLS = [
  { name: "Monitoramento de processos (Escavador)", price: "R$ 2,50 / processo / mês", note: "Cobrado sobre o volume de processos ativos monitorados" },
  { name: "Reunião realizada (comissão consultor)", price: "R$ 97 / reunião", note: "Cobrança consolidada mensal via Asaas" },
  { name: "Instância WhatsApp adicional", price: "Sob consulta", note: "Para escritórios com múltiplas filiais/números" },
  { name: "Setup VIP + migração de dados", price: "R$ 1.500 (único)", note: "Onboarding assistido, import de leads e treinamento" },
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function copyPitch(plan: Plan) {
  const cycles = plan.cycles
    .filter((c) => c.monthly > 0)
    .map((c) => `${c.label}: ${formatBRL(c.monthly)}/mês${c.total ? ` (${formatBRL(c.total)} no período)` : ""}`)
    .join(" · ");
  const text = `${plan.name} — ${plan.tagline}\n${plan.quotaMsg}\n${cycles || "Sob consulta"}\n\nInclui:\n${plan.features.map((f) => "• " + f).join("\n")}`;
  navigator.clipboard.writeText(text);
  toast({ title: "Pitch copiado!", description: `${plan.name} pronto para colar no WhatsApp.` });
}

export default function PricingInternal() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Tabela de Preços — Uso Interno</h1>
            <p className="text-sm text-muted-foreground">
              Valores para consultores. Não compartilhar com clientes — apenas mostrar na apresentação.
            </p>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs">CONFIDENCIAL</Badge>
      </div>

      <Tabs defaultValue="planos" className="w-full">
        <TabsList>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="upsell">Add-ons</TabsTrigger>
          <TabsTrigger value="objecoes">Objeções</TabsTrigger>
          <TabsTrigger value="margem">Margem</TabsTrigger>
        </TabsList>

        <TabsContent value="planos" className="mt-6 grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <Card key={plan.key} className={`bg-gradient-to-br ${plan.color} border-2`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{plan.tagline}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyPitch(plan)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Ciclos de cobrança
                  </div>
                  <div className="space-y-2">
                    {plan.cycles.map((c) => (
                      <div
                        key={c.label}
                        className={`rounded-lg border p-3 ${
                          c.highlight ? "border-primary/40 bg-primary/5" : "border-border bg-background/40"
                        }`}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className={`text-xs uppercase font-semibold ${c.highlight ? "text-primary" : "text-muted-foreground"}`}>
                            {c.label}
                          </span>
                          <span className={`text-xl font-bold ${c.highlight ? "text-primary" : ""}`}>
                            {c.monthly > 0 ? `${formatBRL(c.monthly)}/mês` : "Sob consulta"}
                          </span>
                        </div>
                        {c.total && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Total no período: <strong>{formatBRL(c.total)}</strong>
                          </div>
                        )}
                        {c.note && <div className="mt-1 text-xs italic text-muted-foreground">{c.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md bg-background/60 border border-border p-3">
                  <div className="text-xs uppercase font-semibold text-muted-foreground mb-1">Cota</div>
                  <div className="text-sm font-medium">{plan.quotaMsg}</div>
                </div>

                <div>
                  <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">Público ideal</div>
                  <p className="text-sm">{plan.bestFor}</p>
                </div>

                <div>
                  <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">Inclui</div>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="upsell" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add-ons e cobranças variáveis</CardTitle>
              <CardDescription>Ofereça em cima do plano contratado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {UPSELLS.map((u) => (
                <div key={u.name} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{u.note}</div>
                  </div>
                  <Badge variant="secondary" className="whitespace-nowrap">{u.price}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objecoes" className="mt-6 space-y-3">
          {OBJECTIONS.map((o) => (
            <Card key={o.q}>
              <CardContent className="pt-6">
                <div className="text-sm font-semibold text-primary mb-2">❓ {o.q}</div>
                <p className="text-sm text-muted-foreground">{o.a}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="margem" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Margem por ciclo (cap 15k mensagens)
              </CardTitle>
              <CardDescription>Custo variável médio ~R$ 251/cliente/mês (Gemini + Whisper + UaZapi + infra).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2">Ciclo</th>
                      <th className="py-2">Preço/mês</th>
                      <th className="py-2">Custo</th>
                      <th className="py-2">Lucro</th>
                      <th className="py-2">Margem</th>
                      <th className="py-2">Piso de venda</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-3 font-medium">Mensal</td>
                      <td>R$ 897</td>
                      <td>R$ 251</td>
                      <td className="text-emerald-500 font-semibold">R$ 646</td>
                      <td>72%</td>
                      <td className="text-xs text-muted-foreground">R$ 797</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 font-medium">Semestral</td>
                      <td>R$ 797</td>
                      <td>R$ 251</td>
                      <td className="text-emerald-500 font-semibold">R$ 546</td>
                      <td>68%</td>
                      <td className="text-xs text-muted-foreground">R$ 697</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium">Anual</td>
                      <td>R$ 597</td>
                      <td>R$ 251</td>
                      <td className="text-emerald-500 font-semibold">R$ 346</td>
                      <td>58%</td>
                      <td className="text-xs text-destructive font-semibold">R$ 497 (limite)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                <strong className="text-amber-500">⚠️ Regra de ouro:</strong> Nunca vender abaixo do piso sem aprovação. Anual mínimo absoluto = <strong>R$ 497/mês</strong>. Abaixo disso, o cliente dá prejuízo.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
