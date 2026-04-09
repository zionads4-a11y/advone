import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, XCircle, Clock, Crown, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navigate } from "react-router-dom";

interface SubscriptionRow {
  id: string;
  plan: string;
  status: string;
  value: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  company_id: string | null;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
}

const planLabels: Record<string, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  elite: "Elite",
};

function getStatusConfig(status: string) {
  switch (status) {
    case "active":
      return { label: "Ativa", icon: CheckCircle2, variant: "default" as const, className: "bg-green-500 hover:bg-green-600" };
    case "overdue":
      return { label: "Atrasada", icon: AlertTriangle, variant: "destructive" as const, className: "" };
    case "cancelled":
      return { label: "Cancelada", icon: XCircle, variant: "secondary" as const, className: "bg-muted text-muted-foreground" };
    case "pending":
      return { label: "Pendente", icon: Clock, variant: "outline" as const, className: "" };
    default:
      return { label: status, icon: Clock, variant: "outline" as const, className: "" };
  }
}

export default function Subscription() {
  const { user, userRole } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Only admin can access this page
  if (userRole && userRole !== "admin" && userRole !== "member") {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      setLoading(true);

      // Fetch all subscriptions (admin has ALL policy)
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      setSubscriptions(subs || []);

      // Get company names
      const companyIds = [...new Set((subs || []).map(s => s.company_id).filter(Boolean))] as string[];
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds);
        const map: Record<string, string> = {};
        (companies || []).forEach(c => { map[c.id] = c.name; });
        setCompanyNames(map);
      }

      // Get profile names
      const userIds = [...new Set((subs || []).map(s => s.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const map: Record<string, string> = {};
        (profiles || []).forEach(p => { map[p.user_id] = p.full_name; });
        setProfileNames(map);
      }

      setLoading(false);
    };

    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Assinaturas</h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: subscriptions.length, color: "text-foreground" },
          { label: "Ativas", value: subscriptions.filter(s => s.status === "active").length, color: "text-green-500" },
          { label: "Atrasadas", value: subscriptions.filter(s => s.status === "overdue").length, color: "text-destructive" },
          { label: "Canceladas", value: subscriptions.filter(s => s.status === "cancelled").length, color: "text-muted-foreground" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Todas as Assinaturas</CardTitle>
          <CardDescription>Visão geral de todas as assinaturas dos clientes</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma assinatura encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map(sub => {
                    const sc = getStatusConfig(sub.status);
                    const StatusIcon = sc.icon;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {profileNames[sub.user_id] || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {sub.company_id ? companyNames[sub.company_id] || "—" : "—"}
                          </span>
                        </TableCell>
                        <TableCell>{planLabels[sub.plan] || sub.plan}</TableCell>
                        <TableCell>R$ {sub.value.toFixed(2).replace(".", ",")}</TableCell>
                        <TableCell>
                          <Badge className={sc.className} variant={sc.variant}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(sub.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
