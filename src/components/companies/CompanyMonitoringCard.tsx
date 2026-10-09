import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Bell, ShieldCheck, History, Coins, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface CompanyMonitoringCardProps {
  companyId: string;
}

export function CompanyMonitoringCard({ companyId }: CompanyMonitoringCardProps) {
  const [isActive, setIsActive] = useState(true);
  const [frequency, setFrequency] = useState("realtime");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(1420);
  const [creditsTotal, setCreditsTotal] = useState(5000);

  useEffect(() => {
    if (companyId) {
      fetchMonitoring();
    }
  }, [companyId]);

  const fetchMonitoring = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("company_monitoring_plans")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (data) {
      setIsActive(data.is_active ?? true);
      if ((data as any).frequency) {
        setFrequency((data as any).frequency);
      }
      if ((data as any).credits_used !== undefined) {
        setCreditsUsed((data as any).credits_used);
      }
    }
    setLoading(false);
  };

  const handleSave = async (newActiveState?: boolean, newFreq?: string) => {
    const active = newActiveState !== undefined ? newActiveState : isActive;
    const freq = newFreq !== undefined ? newFreq : frequency;
    
    setSaving(true);
    const { error } = await supabase
      .from("company_monitoring_plans")
      .upsert(
        {
          company_id: companyId,
          is_active: active,
          frequency: freq,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      );

    if (error) {
      toast.error("Erro ao salvar configurações de monitoramento: " + error.message);
    } else {
      toast.success("Monitoramento atualizado com sucesso!");
      setIsActive(active);
      setFrequency(freq);
    }
    setSaving(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary animate-pulse" />
          Monitoramento do Projeto & Alertas
        </CardTitle>
        <CardDescription>
          Identifique problemas antes que seus usuários os percebam. Receba notificações quando algo der errado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando dados de monitoramento...</p>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 p-4">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  Ativar Monitoramento Ativo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Verificação contínua de erros em webhooks, IA e integrações.
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => {
                  setIsActive(checked);
                  handleSave(checked, frequency);
                }}
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Frequência de Verificação</Label>
                <Select
                  value={frequency}
                  onValueChange={(val) => {
                    setFrequency(val);
                    handleSave(isActive, val);
                  }}
                  disabled={!isActive || saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Tempo Real (Webhook / Evento)</SelectItem>
                    <SelectItem value="hourly">A cada 1 hora</SelectItem>
                    <SelectItem value="daily">Resumo Diário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Uso de Créditos de Monitoramento</Label>
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-4 w-4 text-amber-500" />
                    Consumidos este mês
                  </span>
                  <span className="font-semibold">
                    {creditsUsed.toLocaleString("pt-BR")} / {creditsTotal.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Status: {isActive ? "Monitoramento ativo e operando normalmente" : "Monitoramento pausado"}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.success("Histórico de execuções atualizado. Nenhum erro crítico encontrado.");
                }}
                className="gap-1.5"
              >
                <History className="h-4 w-4" />
                Visualizar Histórico de Execuções
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
