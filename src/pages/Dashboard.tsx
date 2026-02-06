import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Target, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface LeadStats {
  total: number;
  new: number;
  won: number;
  lost: number;
  totalValue: number;
}

const STATUS_COLORS = {
  new: "hsl(38, 92%, 50%)",
  contacted: "hsl(210, 100%, 52%)",
  qualified: "hsl(270, 70%, 55%)",
  negotiating: "hsl(200, 80%, 50%)",
  won: "hsl(153, 60%, 45%)",
  lost: "hsl(0, 72%, 51%)",
};

export default function Dashboard() {
  const { userRole } = useAuth();
  const { isClient, filterByCompany, loading: companiesLoading } = useUserCompanies();
  const [stats, setStats] = useState<LeadStats>({ total: 0, new: 0, won: 0, lost: 0, totalValue: 0 });
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [sourceData, setSourceData] = useState<{ name: string; leads: number }[]>([]);

  useEffect(() => {
    if (!companiesLoading) {
      fetchStats();
    }
  }, [companiesLoading]);

  const fetchStats = async () => {
    let query = supabase.from("leads").select("status, value, source, company_id");
    query = filterByCompany(query);
    const { data: leads } = await query;

    if (leads) {
      const total = leads.length;
      const newLeads = leads.filter((l) => l.status === "new").length;
      const won = leads.filter((l) => l.status === "won").length;
      const lost = leads.filter((l) => l.status === "lost").length;
      const totalValue = leads.filter((l) => l.status === "won").reduce((sum, l) => sum + (Number(l.value) || 0), 0);

      setStats({ total, new: newLeads, won, lost, totalValue });

      const statusCounts: Record<string, number> = {};
      leads.forEach((l) => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
      });

      setStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({
          name: statusLabel(name),
          value,
          color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] || "hsl(220, 15%, 50%)",
        }))
      );

      const google = leads.filter((l) => l.source === "google").length;
      const meta = leads.filter((l) => l.source === "meta").length;
      const other = leads.filter((l) => !l.source).length;
      setSourceData([
        { name: "Google Ads", leads: google },
        { name: "Meta Ads", leads: meta },
        { name: "Outros", leads: other },
      ]);
    }
  };

  const greeting = isClient ? "Portal do Cliente" : "Dashboard";
  const subtitle = isClient ? "Acompanhe os leads da sua empresa" : "Visão geral dos seus leads e campanhas";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{greeting}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total de Leads" value={stats.total} icon={Users} variant="info" />
        <MetricCard title="Novos Leads" value={stats.new} icon={Target} variant="warning" subtitle="Aguardando contato" />
        <MetricCard title="Vendas Fechadas" value={stats.won} icon={TrendingUp} variant="success" />
        <MetricCard
          title="Valor Total"
          value={`R$ ${stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
              Leads por Origem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 25%, 9%)", border: "1px solid hsl(220, 20%, 16%)", borderRadius: 8, color: "hsl(220, 10%, 92%)" }}
                />
                <Bar dataKey="leads" fill="hsl(153, 60%, 45%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-foreground">
              <Target className="h-4 w-4 text-primary" />
              Leads por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(220, 25%, 9%)", border: "1px solid hsl(220, 20%, 16%)", borderRadius: 8, color: "hsl(220, 10%, 92%)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-muted-foreground">
                Nenhum lead cadastrado ainda
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-3 justify-center">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name} ({item.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
