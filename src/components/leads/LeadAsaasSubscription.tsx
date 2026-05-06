import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  leadId: string;
  companyId: string;
}

interface LeadSub {
  id: string;
  value: number;
  cycle: string;
  billing_type: string;
  status: string;
  invoice_url: string | null;
  asaas_subscription_id: string | null;
  created_at: string;
}

const cycleLabel: Record<string, string> = {
  MONTHLY: "Mensal", WEEKLY: "Semanal", BIWEEKLY: "Quinzenal",
  QUARTERLY: "Trimestral", SEMIANNUALLY: "Semestral", YEARLY: "Anual",
};
const billingLabel: Record<string, string> = {
  UNDEFINED: "PIX ou Cartão", PIX: "PIX", CREDIT_CARD: "Cartão", BOLETO: "Boleto",
};

export function LeadAsaasSubscription({ leadId, companyId }: Props) {
  const [subs, setSubs] = useState<LeadSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [value, setValue] = useState("697");
  const [billing, setBilling] = useState("UNDEFINED");
  const [cycle, setCycle] = useState("MONTHLY");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lead_subscriptions")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    setSubs((data as LeadSub[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [leadId]);

  const create = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-lead-subscription", {
        body: { lead_id: leadId, value: Number(value), billing_type: billing, cycle },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast.success("Cobrança recorrente criada no Asaas");
      await load();
    } catch (e) {
      toast.error("Erro: " + ((e as Error).message || "falha"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <CreditCard className="h-3.5 w-3.5" /> Cobrança Recorrente (Asaas)
      </h4>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Valor (R$)</Label>
          <Input value={value} onChange={(e) => setValue(e.target.value)} type="number" step="0.01" />
        </div>
        <div>
          <Label className="text-xs">Forma</Label>
          <Select value={billing} onValueChange={setBilling}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UNDEFINED">PIX ou Cartão</SelectItem>
              <SelectItem value="PIX">Somente PIX</SelectItem>
              <SelectItem value="CREDIT_CARD">Somente Cartão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Ciclo</Label>
          <Select value={cycle} onValueChange={setCycle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Mensal</SelectItem>
              <SelectItem value="WEEKLY">Semanal</SelectItem>
              <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
              <SelectItem value="QUARTERLY">Trimestral</SelectItem>
              <SelectItem value="YEARLY">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={create} disabled={creating} size="sm" className="w-full">
        {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
        Criar cobrança recorrente
      </Button>

      <p className="text-[11px] text-muted-foreground">
        Requer CPF/CNPJ do cliente cadastrado no lead. O cliente recebe um link Asaas para escolher PIX ou cartão; cobrado automaticamente todo mês.
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : subs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma cobrança ativa.</p>
      ) : (
        <div className="space-y-2">
          {subs.map((s) => (
            <div key={s.id} className="border border-border rounded-md p-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  R$ {Number(s.value).toFixed(2).replace(".", ",")} / {cycleLabel[s.cycle] || s.cycle}
                </span>
                <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
              </div>
              <div className="text-muted-foreground">{billingLabel[s.billing_type] || s.billing_type}</div>
              {s.invoice_url && (
                <a href={s.invoice_url} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Link de pagamento
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
