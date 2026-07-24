import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useOperatorProfile } from "@/hooks/useOperatorProfile";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, TrendingUp, Target, Activity, Sparkles } from "lucide-react";
import { ComercialDashboard } from "@/components/dashboard/ComercialDashboard";
import { AreasDashboard } from "@/components/dashboard/AreasDashboard";
import { FinanceiroDashboard } from "@/components/dashboard/FinanceiroDashboard";
import { MessageQuotaCard } from "@/components/companies/MessageQuotaCard";

interface LeadStats { total: number; new: number; won: number; lost: number; totalValue: number; }

function OverviewMaster() {
  const { filterByCompany, loading, companyIds } = useUserCompanies();
  const [stats, setStats] = useState<LeadStats>({ total: 0, new: 0, won: 0, lost: 0, totalValue: 0 });

  useEffect(() => {
    if (loading) return;
    (async () => {
      let q = supabase.from("leads").select("status, value");
      q = filterByCompany(q);
      const { data } = await q;
      const leads = data ?? [];
      setStats({
        total: leads.length,
        new: leads.filter((l: any) => l.status === "new").length,
        won: leads.filter((l: any) => l.status === "won").length,
        lost: leads.filter((l: any) => l.status === "lost").length,
        totalValue: leads.filter((l: any) => l.status === "won").reduce((s: number, l: any) => s + (Number(l.value) || 0), 0),
      });
    })();
  }, [loading]);

  const conv = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : "0";
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-primary/10">
        <CardContent className="p-6">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Performance do Mês</div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-5xl font-bold text-foreground">{conv}%</span>
            <span className="text-xs font-semibold text-success">Taxa de conversão</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{stats.won} contratos fechados de {stats.total} leads recebidos.</p>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total de Leads" value={stats.total} icon={Users} variant="info" />
        <MetricCard title="Novos Leads" value={stats.new} icon={Target} variant="accent" />
        <MetricCard title="Vendas Fechadas" value={stats.won} icon={TrendingUp} variant="success" />
        <MetricCard title="Faturamento" value={`R$ ${stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="success" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { userRole } = useAuth();
  const { isClient } = useUserCompanies();
  const { profile, loading: profileLoading } = useOperatorProfile();

  // Admin/member/gerente e cliente → visão Master completa
  const isPrivileged = userRole === "admin" || userRole === "member" || userRole === "gerente" || userRole === "cliente";
  const effectiveProfile = isPrivileged ? "master" : profile;

  const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">Painel</span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Badge className="border-success/30 bg-success/15 text-success"><Activity className="mr-1.5 h-3 w-3" />Atualizado agora</Badge>
    </div>
  );

  const wrap = (title: string, subtitle: string, node: React.ReactNode) => (
    <div className="dark -m-4 min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:-m-6 sm:p-6 md:-m-8 md:p-8">
      <div className="space-y-6 animate-fade-in">
        <Header title={title} subtitle={subtitle} />
        {node}
      </div>
    </div>
  );

  if (profileLoading && !isPrivileged) return wrap("Dashboard", "Carregando…", <div />);

  if (effectiveProfile === "sdr_closer") {
    return wrap("Dashboard Comercial", "Suas reuniões, fechamentos e ranking", <ComercialDashboard hideHonorarios />);
  }
  if (effectiveProfile === "financeiro") {
    return wrap("Dashboard Financeiro", "Faturamento, contas e caixa Asaas", <FinanceiroDashboard />);
  }
  if (effectiveProfile === "advogado_responsavel" || effectiveProfile === "estagiario") {
    return wrap("Meus Processos", "Saúde da carteira jurídica", <AreasDashboard />);
  }

  // Master / Admin / Cliente → abas
  return wrap(
    isClient ? "Portal do Cliente" : "Dashboard",
    isClient ? "Acompanhe os leads da sua empresa" : "Visão completa do escritório",
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        <TabsTrigger value="comercial">Comercial</TabsTrigger>
        <TabsTrigger value="areas">Áreas</TabsTrigger>
        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4"><OverviewMaster /></TabsContent>
      <TabsContent value="comercial" className="mt-4"><ComercialDashboard hideHonorarios={false} /></TabsContent>
      <TabsContent value="areas" className="mt-4"><AreasDashboard /></TabsContent>
      <TabsContent value="financeiro" className="mt-4"><FinanceiroDashboard /></TabsContent>
    </Tabs>,
  );
}
