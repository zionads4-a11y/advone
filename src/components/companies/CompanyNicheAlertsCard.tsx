import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { NICHE_CATALOG } from "@/lib/modulePermissions";

interface NicheAlert {
  id: string;
  niche: string;
  whatsapp: string;
  lawyer_name: string | null;
  is_active: boolean;
}

export function CompanyNicheAlertsCard({ companyId }: { companyId: string }) {
  const [alerts, setAlerts] = useState<NicheAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [niche, setNiche] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState("");
  const [lawyerName, setLawyerName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from("company_niche_alerts")
      .select("id, niche, whatsapp, lawyer_name, is_active")
      .eq("company_id", companyId)
      .order("niche");
    setAlerts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) fetchAlerts();
  }, [companyId]);

  const handleAdd = async () => {
    if (!niche || !whatsapp.trim()) {
      toast.error("Selecione a área e informe o WhatsApp");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("company_niche_alerts")
      .upsert(
        {
          company_id: companyId,
          niche,
          whatsapp: whatsapp.trim(),
          lawyer_name: lawyerName.trim() || null,
          is_active: true,
        },
        { onConflict: "company_id,niche" }
      );
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Roteamento salvo!");
      setNiche("");
      setWhatsapp("");
      setLawyerName("");
      fetchAlerts();
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, value: boolean) => {
    await supabase.from("company_niche_alerts").update({ is_active: value }).eq("id", id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: value } : a)));
  };

  const handleDelete = async (id: string) => {
    await supabase.from("company_niche_alerts").delete().eq("id", id);
    fetchAlerts();
  };

  const availableNiches = NICHE_CATALOG.filter(
    (n) => !alerts.some((a) => a.niche === n.key)
  );

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          Notificações por Área de Atuação
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Configure um número de WhatsApp diferente para cada área. Quando uma reunião
          for agendada, o alerta vai automaticamente para o advogado responsável pela área.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum roteamento por área configurado. As notificações irão para o WhatsApp principal da empresa.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => {
              const meta = NICHE_CATALOG.find((n) => n.key === a.niche);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3"
                >
                  <span className="text-lg">{meta?.emoji || "⚖️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {meta?.label || a.niche}
                      {a.lawyer_name && (
                        <span className="text-muted-foreground font-normal"> · {a.lawyer_name}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.whatsapp}</p>
                  </div>
                  <Switch
                    checked={a.is_active}
                    onCheckedChange={(v) => handleToggle(a.id, v)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {availableNiches.length > 0 && (
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Adicionar nova área
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Área</Label>
                <Select value={niche} onValueChange={setNiche}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNiches.map((n) => (
                      <SelectItem key={n.key} value={n.key}>
                        {n.emoji} {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">WhatsApp</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="5511999999999"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do advogado (opcional)</Label>
                <Input
                  value={lawyerName}
                  onChange={(e) => setLawyerName(e.target.value)}
                  placeholder="Dr. João"
                />
              </div>
            </div>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="gradient-primary text-primary-foreground"
              size="sm"
            >
              <Plus className="mr-1 h-4 w-4" />
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
