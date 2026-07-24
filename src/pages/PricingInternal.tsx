import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Copy, DollarSign, Sparkles, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Cycle = {
  label: string;
  monthly: number;
  total?: number;
  totalLabel?: string;
  highlight?: boolean;
  note?: string;
};

type Plan = {
  key: string;
  name: string;
  tagline: string;
  quotaMsg: string;
  bestFor: string;
  cycles: Cycle[];
  features: string[];
};

const IA_FEATURES = [
  "Atendimento no WhatsApp 24h com IA Laura",
  "Assistente de IA humanizado",
  "Qualificação inteligente de leads por nicho",
  "Agendamento automático (Google Calendar)",
  "Follow-up automático (5 tentativas)",
  "Transcrição de áudio + leitura de imagens",
  "Atendimento a clientes atuais",
  "Kanban de leads (9 estágios)",
  "Dashboard e relatórios",
];

const IA_PLAN: Plan = {
  key: "ia",
  name: "AdvOne IA",
  tagline: "Sua secretária virtual 24h no WhatsApp",
  quotaMsg: "15.000 mensagens/mês da Laura",
  bestFor:
    "Advogados solo e escritórios de pequeno/médio porte que perdem lead no WhatsApp.",
  cycles: [
    { label: "Mensal", monthly: 897, total: 897, totalLabel: "Total mensal" },
    { label: "Semestral", monthly: 797, total: 4782, totalLabel: "Total semestral", note: "Economia de R$ 600" },
    {
      label: "Anual",
      monthly: 597,
      total: 7164,
      totalLabel: "Total anual",
      highlight: true,
      note: "Mais popular · economia de R$ 3.600/ano",
    },
  ],
  features: IA_FEATURES,
};

const ENTERPRISE_PLAN: Plan = {
  key: "enterprise",
  name: "AdvOne Enterprise",
  tagline: "Central de relacionamento para escritórios grandes",
  quotaMsg: "Mensagens ilimitadas",
  bestFor:
    "Escritórios com 4+ áreas de atuação, equipe grande e centenas de clientes ativos.",
  cycles: [{ label: "Sob medida", monthly: 0, note: "Valor definido pelo consultor conforme escopo" }],
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
};


const UPSELLS = [
  {
    name: "Monitoramento de processos (Escavador)",
    price: "R$ 2,50 / processo / mês",
    note: "Cobrado sobre o volume de processos ativos monitorados",
  },
  {
    name: "Instância WhatsApp adicional",
    price: "Sob consulta",
    note: "Para escritórios com múltiplas filiais/números",
  },
  {
    name: "Setup VIP + migração de dados",
    price: "R$ 1.500 (único)",
    note: "Onboarding assistido, import de leads e treinamento",
  },
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function copyPitch(plan: Plan) {
  const cycles = plan.cycles
    .filter((c) => c.monthly > 0)
    .map((c) => `${c.label}: ${formatBRL(c.monthly)}/mês${c.total ? ` (${formatBRL(c.total)} no período)` : ""}`)
    .join(" · ");
  const text = `${plan.name} — ${plan.tagline}\n${plan.quotaMsg}\n${cycles || "Sob consulta"}\n\nInclui:\n${plan.features
    .map((f) => "• " + f)
    .join("\n")}`;
  navigator.clipboard.writeText(text);
  toast({ title: "Pitch copiado!", description: `${plan.name} pronto para colar no WhatsApp.` });
}

function CycleCard({ cycle, quotaMsg }: { cycle: Cycle; quotaMsg: string }) {
  const isHighlight = !!cycle.highlight;
  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
        isHighlight
          ? "border-primary/60 bg-gradient-to-b from-primary/10 to-background shadow-lg shadow-primary/10"
          : "border-border bg-card"
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground gap-1 shadow-md">
            <Sparkles className="h-3 w-3" />
            Mais popular
          </Badge>
        </div>
      )}

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Users className="h-5 w-5" />
      </div>

      <div>
        <div className="text-lg font-semibold">{cycle.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{quotaMsg}</div>
      </div>

      <div>
        {cycle.monthly > 0 ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">{formatBRL(cycle.monthly)}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            {cycle.total && (
              <div className="mt-2 rounded-md border border-border/60 bg-background/50 px-3 py-2 text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {cycle.totalLabel ?? "Total no período"}
                </div>
                <div className="text-sm font-semibold">{formatBRL(cycle.total)}</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-2xl font-bold">Sob consulta</div>
        )}
      </div>

      {cycle.note && (
        <div className={`text-xs ${isHighlight ? "text-primary font-medium" : "text-muted-foreground italic"}`}>
          {cycle.note}
        </div>
      )}
    </div>
  );
}

export default function PricingInternal() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
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
        <Badge variant="destructive" className="text-xs">
          CONFIDENCIAL
        </Badge>
      </div>

      <Tabs defaultValue="planos" className="w-full">
        <TabsList>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="upsell">Add-ons</TabsTrigger>
          
        </TabsList>

        <TabsContent value="planos" className="mt-6 space-y-8">
          {/* AdvOne IA — 4 ciclos */}
          <div className="space-y-4">
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-primary font-semibold">AdvOne IA</div>
                <h2 className="text-xl font-bold">{IA_PLAN.tagline}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyPitch(IA_PLAN)}>
                <Copy className="h-4 w-4 mr-2" /> Copiar pitch
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {IA_PLAN.cycles.map((c) => (
                <CycleCard key={c.label} cycle={c} quotaMsg={IA_PLAN.quotaMsg} />
              ))}
            </div>

            <Card>
              <CardContent className="pt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">Público ideal</div>
                  <p className="text-sm">{IA_PLAN.bestFor}</p>
                </div>
                <div>
                  <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">Inclui</div>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {IA_PLAN.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enterprise */}
          <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {ENTERPRISE_PLAN.name}
                  </CardTitle>
                  <CardDescription className="mt-1">{ENTERPRISE_PLAN.tagline}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyPitch(ENTERPRISE_PLAN)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-background/40 p-4">
                <div className="text-xs uppercase font-semibold text-muted-foreground mb-1">Cobrança</div>
                <div className="text-xl font-bold">Sob medida</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor definido pelo consultor conforme escopo. {ENTERPRISE_PLAN.quotaMsg}.
                </p>
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">Público ideal</div>
                <p className="text-sm">{ENTERPRISE_PLAN.bestFor}</p>
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">Inclui</div>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {ENTERPRISE_PLAN.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
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
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {u.price}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
