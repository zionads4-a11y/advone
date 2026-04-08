import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowUp, ArrowDown, Loader2, Crown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PLANS = [
  {
    key: "essencial",
    label: "Essencial",
    value: 297,
    color: "hsl(var(--primary))",
    features: ["CRM Completo", "Kanban de Leads", "Bot WhatsApp com IA", "Agenda e Lembretes"],
  },
  {
    key: "profissional",
    label: "Profissional",
    value: 497,
    color: "hsl(262, 80%, 60%)",
    features: ["Tudo do Essencial", "Até 50 processos monitorados", "Alertas de movimentação", "Relatórios avançados"],
  },
  {
    key: "elite",
    label: "Elite",
    value: 697,
    color: "hsl(38, 90%, 55%)",
    features: ["Tudo do Profissional", "Até 100 processos monitorados", "Suporte prioritário", "Funcionalidades exclusivas"],
  },
];

interface PlanChangeSectionProps {
  currentPlan: string;
  subscriptionStatus: string;
  onPlanChanged: () => void;
}

export default function PlanChangeSection({ currentPlan, subscriptionStatus, onPlanChanged }: PlanChangeSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentIndex = PLANS.findIndex((p) => p.key === currentPlan);

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("change-plan", {
        body: { new_plan: selectedPlan },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Plano alterado para ${PLANS.find((p) => p.key === selectedPlan)?.label} com sucesso!`);
      onPlanChanged();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar plano");
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const canChange = subscriptionStatus === "active" || subscriptionStatus === "pending";

  if (!canChange) return null;

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Alterar Plano</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan, index) => {
            const isCurrent = plan.key === currentPlan;
            const isUpgrade = index > currentIndex;
            const isDowngrade = index < currentIndex;

            return (
              <Card
                key={plan.key}
                className={`relative transition-all ${
                  isCurrent
                    ? "border-2 border-primary ring-2 ring-primary/20"
                    : "border hover:border-primary/40 hover:shadow-md cursor-pointer"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs">Plano atual</Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-5">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" style={{ color: plan.color }} />
                    <CardTitle className="text-base">{plan.label}</CardTitle>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {plan.value}<span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <Button
                      variant={isUpgrade ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedPlan(plan.key)}
                    >
                      {isUpgrade ? (
                        <>
                          <ArrowUp className="h-3.5 w-3.5 mr-1" />
                          Upgrade
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-3.5 w-3.5 mr-1" />
                          Downgrade
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de plano</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPlan && (
                <>
                  Você está alterando do plano <strong>{PLANS.find((p) => p.key === currentPlan)?.label}</strong> para o plano{" "}
                  <strong>{PLANS.find((p) => p.key === selectedPlan)?.label}</strong>.
                  <br />
                  <br />
                  O novo valor será de <strong>R$ {PLANS.find((p) => p.key === selectedPlan)?.value},00/mês</strong>.
                  A alteração será aplicada no próximo ciclo de cobrança.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangePlan} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
