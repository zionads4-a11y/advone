import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, XCircle, Clock, Crown } from "lucide-react";
import PlanChangeSection from "@/components/subscription/PlanChangeSection";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  value: number;
  created_at: string;
  updated_at: string;
  asaas_subscription_id: string | null;
}

const planDetails: Record<string, { label: string; features: string[]; color: string }> = {
  essencial: {
    label: "Essencial",
    features: [
      "CRM Completo",
      "Kanban de Leads",
      "Gestão Financeira",
      "Bot WhatsApp com IA",
      "Agenda e Lembretes",
    ],
    color: "bg-blue-500",
  },
  profissional: {
    label: "Profissional",
    features: [
      "Tudo do Essencial",
      "Monitoramento de até 50 processos",
      "Alertas de movimentação",
      "Relatórios avançados",
    ],
    color: "bg-purple-500",
  },
  elite: {
    label: "Elite",
    features: [
      "Tudo do Profissional",
      "Monitoramento de até 100 processos",
      "Suporte prioritário",
      "Funcionalidades exclusivas",
    ],
    color: "bg-amber-500",
  },
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
    case "expired":
      return { label: "Expirada", icon: XCircle, variant: "secondary" as const, className: "" };
    case "refunded":
      return { label: "Reembolsada", icon: CreditCard, variant: "outline" as const, className: "" };
    default:
      return { label: status, icon: Clock, variant: "outline" as const, className: "" };
  }
}

export default function Subscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSubscription = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchSubscription();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Minha Assinatura</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhuma assinatura encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">Entre em contato com o suporte para mais informações.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = planDetails[subscription.plan] || planDetails.essencial;
  const statusConfig = getStatusConfig(subscription.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground">Minha Assinatura</h1>
        <Badge className={statusConfig.className} variant={statusConfig.variant}>
          <StatusIcon className="h-3.5 w-3.5 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${plan.color}`}>
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Plano {plan.label}</CardTitle>
                <CardDescription>Sua assinatura atual</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                R$ {subscription.value.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <Separator />
            <ul className="space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-muted">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Informações de Pagamento</CardTitle>
                <CardDescription>Detalhes da sua cobrança</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={statusConfig.className} variant={statusConfig.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Plano</span>
                <span className="text-sm font-medium text-foreground">{plan.label}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor mensal</span>
                <span className="text-sm font-medium text-foreground">
                  R$ {subscription.value.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Assinante desde</span>
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(subscription.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Última atualização</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(subscription.updated_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {subscription.status === "overdue" && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Pagamento atrasado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sua assinatura possui um pagamento pendente. Regularize para continuar utilizando todos os recursos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {subscription.status === "cancelled" && (
        <Card className="border-muted bg-muted/30">
          <CardContent className="flex items-start gap-3 py-4">
            <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Assinatura cancelada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sua assinatura foi cancelada. Entre em contato com o suporte para reativá-la.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
