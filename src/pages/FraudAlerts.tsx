import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFraudAlerts } from "@/hooks/useCommissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldAlert, AlertTriangle, Building2, Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";

const severityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-primary/10 text-primary border-primary/20" },
  medium: { label: "Média", className: "bg-secondary/30 text-secondary-foreground border-secondary/40" },
  high: { label: "Alta", className: "bg-accent/20 text-accent-foreground border-accent/30" },
  critical: { label: "Crítica", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-secondary/30 text-secondary-foreground" },
  reviewing: { label: "Em análise", className: "bg-primary/10 text-primary" },
  confirmed_fraud: { label: "Fraude confirmada", className: "bg-destructive/10 text-destructive" },
  false_positive: { label: "Falso positivo", className: "bg-muted text-muted-foreground" },
  resolved: { label: "Resolvido", className: "bg-accent/20 text-accent-foreground" },
};

export default function FraudAlerts() {
  const { userRole, user } = useAuth();
  const { alerts, companyNames, loading, isAdmin, refetch } = useFraudAlerts();
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isAdmin && userRole) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const updateStatus = async (newStatus: string) => {
    if (!selected || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("fraud_alerts")
      .update({
        status: newStatus,
        resolution_notes: resolution || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    setSaving(false);
    if (error) {
      toast.error("Erro ao atualizar alerta");
      return;
    }
    toast.success("Alerta atualizado");
    setSelected(null);
    setResolution("");
    refetch();
  };

  const openCount = alerts.filter((a) => a.status === "open").length;
  const confirmedCount = alerts.filter((a) => a.status === "confirmed_fraud").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas de Fraude</h1>
          <p className="text-sm text-muted-foreground">Detecção automática de leads suspeitos de fechamento por fora</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Alertas abertos</p>
            <p className="text-2xl font-bold text-accent-foreground">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Fraudes confirmadas</p>
            <p className="text-2xl font-bold text-destructive">{confirmedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total monitorado</p>
            <p className="text-2xl font-bold">{alerts.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Alertas</CardTitle>
          <CardDescription>
            Sistema detecta automaticamente quando um lead "quente" ou com longa conversa é movido para "Perdido". 
            Investigue cada caso para identificar fechamentos por fora da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-accent/60 mb-3" />
              <p className="text-muted-foreground">Nenhum alerta de fraude registrado.</p>
              <p className="text-xs text-muted-foreground mt-1">Tudo certo por aqui!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const sev = severityConfig[alert.severity] || severityConfig.medium;
                const st = statusConfig[alert.status] || statusConfig.open;
                return (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-sm">{alert.title}</h3>
                          <Badge variant="outline" className={sev.className}>{sev.label}</Badge>
                          <Badge variant="outline" className={st.className}>{st.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {companyNames[alert.company_id] || "—"}
                          </span>
                          <span>{new Date(alert.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelected(alert)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Analisar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Análise do Alerta</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold mb-2">Evidências coletadas:</p>
                <pre className="text-xs overflow-x-auto">{JSON.stringify(selected.evidence, null, 2)}</pre>
              </div>
              <div>
                <label className="text-sm font-medium">Notas da análise</label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Ex: Confirmado fechamento por fora — cobrar comissão retroativa..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
            <Button variant="outline" onClick={() => updateStatus("false_positive")} disabled={saving}>
              <XCircle className="h-4 w-4 mr-1" /> Falso positivo
            </Button>
            <Button variant="outline" onClick={() => updateStatus("reviewing")} disabled={saving}>
              Em análise
            </Button>
            <Button variant="destructive" onClick={() => updateStatus("confirmed_fraud")} disabled={saving}>
              Confirmar fraude
            </Button>
            <Button onClick={() => updateStatus("resolved")} disabled={saving}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
