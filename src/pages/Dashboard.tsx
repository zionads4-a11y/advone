import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  Activity,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface LeadStats {
  total: number;
  new: number;
  won: number;
  lost: number;
  totalValue: number;
}

const STATUS_COLORS: Record<string, string> = {
  new: "hsl(41, 70%, 55%)",
  contacted: "hsl(205, 80%, 55%)",
  qualified: "hsl(180, 60%, 45%)",
  negotiating: "hsl(198, 70%, 48%)",
  won: "hsl(160, 65%, 45%)",
  lost: "hsl(0, 70%, 55%)",
};

export default function Dashboard() {
  const { userRole } = useAuth();
  const { isClient, filterByCompany, loading: companiesLoading } = useUserCompanies();
  const [stats, setStats] = useState<LeadStats>({ total: 0, new: 0, won: 0, lost: 0, totalValue: 0 });
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [sourceData, setSourceData] = useState<{ name: string; leads: number }[]>([]);
  const [trendData, setTrendData] = useState<{ name: string; leads: number; vendas: number }[]>([]);

  useEffect(() => {
    if (!companiesLoading) {
      fetchStats();
    }
  }, [companiesLoading]);

  const fetchStats = async () => {
    let query = supabase.from("leads").select("status, value, source, company_id, created_at");
    query = filterByCompany(query);
    const { data: leads } = await query;

    if (leads) {
      const total = leads.length;
      const newLeads = leads.filter((l) => l.status === "new").length;
      const won = leads.filter((l) => l.status === "won").length;
      const lost = leads.filter((l) => l.status === "lost").length;
      const totalValue = leads
        .filter((l) => l.status === "won")
        .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

      setStats({ total, new: newLeads, won, lost, totalValue });

      const statusCounts: Record<string, number> = {};
      leads.forEach((l) => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
      });

      setStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({
          name: statusLabel(name),
          value,
          color: STATUS_COLORS[name] || "hsl(215, 15%, 50%)",
        }))
      );

      const google = leads.filter((l) => l.source === "google").length;
      const meta = leads.filter((l) => l.source === "meta").length;
      const other = leads.filter((l) => !l.source).length;
      setSourceData([
        { name: "Google", leads: google },
        { name: "Meta", leads: meta },
        { name: "Outros", leads: other },
      ]);

      // Tendência últimos 7 dias
      const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
      const today = new Date();
      const trend = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const dayLeads = leads.filter((l) => {
          const ld = new Date(l.created_at);
          return ld.toDateString() === d.toDateString();
        });
        return {
          name: days[d.getDay() === 0 ? 6 : d.getDay() - 1],
          leads: dayLeads.length,
          vendas: dayLeads.filter((l) => l.status === "won").length,
        };
      });
      setTrendData(trend);
    }
  };

  const greeting = isClient ? "Portal do Cliente" : "Dashboard";
  const subtitle = isClient ? "Acompanhe os leads da sua empresa" : "Visão geral do seu escritório";
  const conversionRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : "0";

  return (
    <div className="dark -m-4 min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:-m-6 sm:p-6 md:-m-8 md:p-8">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">
                Visão Geral
              </span>
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground">
              {greeting}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Badge className="border-success/30 bg-success/15 text-success hover:bg-success/20">
            <Activity className="mr-1.5 h-3 w-3" />
            Atualizado agora
          </Badge>
        </div>

        {/* Hero — Performance card destacado */}
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-primary/10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
          <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[1.2fr,1fr]">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
                Performance do Mês
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-display text-5xl font-bold text-foreground">
                  {conversionRate}%
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-md bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                  <ArrowUpRight className="h-3 w-3" />
                  Taxa de conversão
                </span>
              </div>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {stats.won} contratos fechados de {stats.total} leads recebidos. Mantenha o ritmo
                acompanhando follow-ups pendentes.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-4">
                <div className="border-l-2 border-primary/40 pl-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Faturamento
                  </p>
                  <p className="mt-0.5 font-display text-lg font-bold text-foreground">
                    R$ {stats.totalValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="border-l-2 border-accent/40 pl-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Pipeline
                  </p>
                  <p className="mt-0.5 font-display text-lg font-bold text-foreground">{stats.new}</p>
                </div>
                <div className="border-l-2 border-destructive/40 pl-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Perdidos
                  </p>
                  <p className="mt-0.5 font-display text-lg font-bold text-foreground">{stats.lost}</p>
                </div>
              </div>
            </div>

            {/* Mini area chart */}
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(198, 70%, 55%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(198, 70%, 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="vendasGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(41, 70%, 55%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(41, 70%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(215, 12%, 60%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(215, 42%, 10%)",
                      border: "1px solid hsl(215, 30%, 18%)",
                      borderRadius: 8,
                      color: "hsl(210, 20%, 92%)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="hsl(198, 70%, 55%)"
                    strokeWidth={2}
                    fill="url(#leadsGradient)"
                    name="Leads"
                  />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="hsl(41, 70%, 55%)"
                    strokeWidth={2}
                    fill="url(#vendasGradient)"
                    name="Vendas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Métricas principais */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total de Leads" value={stats.total} icon={Users} variant="info" />
          <MetricCard
            title="Novos Leads"
            value={stats.new}
            icon={Target}
            variant="accent"
            subtitle="Aguardando contato"
          />
          <MetricCard title="Vendas Fechadas" value={stats.won} icon={TrendingUp} variant="success" />
          <MetricCard
            title="Faturamento"
            value={`R$ ${stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            variant="success"
          />
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Bar — Origem */}
          <Card className="border-border/60 bg-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 font-display text-base text-foreground">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Leads por Origem
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Distribuição por canal de aquisição
                </p>
              </div>
              <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
                Mês atual
              </Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sourceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(198, 70%, 55%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(198, 70%, 35%)" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 30%, 18%)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(215, 12%, 65%)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(215, 12%, 65%)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(215, 30%, 18%)", opacity: 0.4 }}
                    contentStyle={{
                      background: "hsl(215, 42%, 10%)",
                      border: "1px solid hsl(215, 30%, 18%)",
                      borderRadius: 8,
                      color: "hsl(210, 20%, 92%)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="leads" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie — Status */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base text-foreground">
                <Target className="h-4 w-4 text-accent" />
                Status dos Leads
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Funil de conversão</p>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="hsl(215, 42%, 10%)"
                        strokeWidth={2}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(215, 42%, 10%)",
                          border: "1px solid hsl(215, 30%, 18%)",
                          borderRadius: 8,
                          color: "hsl(210, 20%, 92%)",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 space-y-2">
                    {statusData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-semibold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                  Nenhum lead cadastrado ainda
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    new: "Novo",
    contacted: "Contatado",
    qualified: "Qualificado",
    negotiating: "Negociando",
    won: "Vendido",
    lost: "Perdido",
  };
  return labels[status] || status;
}
