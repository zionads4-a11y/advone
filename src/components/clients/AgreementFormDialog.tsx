import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Calculator } from "lucide-react";
import { brl, buildInstallments, calcAgreement } from "@/lib/agreements";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: any;
  companyId: string;
  agreement?: any | null;
  onSaved?: () => void;
}

export function AgreementFormDialog({ open, onOpenChange, lead, companyId, agreement, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("Acordo");
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState<string>("");
  const [feePct, setFeePct] = useState<string>("30");
  const [paymentType, setPaymentType] = useState<"avista" | "parcelado">("avista");
  const [installmentsCount, setInstallmentsCount] = useState<string>("1");
  const [firstDue, setFirstDue] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (agreement) {
      setTitle(agreement.title || "Acordo");
      setDescription(agreement.description || "");
      setTotal(String(agreement.total_amount ?? ""));
      setFeePct(String(agreement.fee_percentage ?? 30));
      setPaymentType((agreement.payment_type as any) || "avista");
      setInstallmentsCount(String(agreement.installments_count ?? 1));
      setFirstDue(agreement.first_due_date || new Date().toISOString().slice(0, 10));
    } else {
      setTitle("Acordo"); setDescription(""); setTotal(""); setFeePct("30");
      setPaymentType("avista"); setInstallmentsCount("1");
      setFirstDue(new Date().toISOString().slice(0, 10));
    }
  }, [open, agreement]);

  const calc = useMemo(() => calcAgreement(Number(total || 0), Number(feePct || 0)), [total, feePct]);
  const previewInstallments = useMemo(() => {
    const n = paymentType === "avista" ? 1 : Math.max(1, Number(installmentsCount || 1));
    return buildInstallments(calc.fee, n, firstDue);
  }, [calc.fee, installmentsCount, firstDue, paymentType]);

  const save = async () => {
    if (!user || !companyId) return;
    if (!total || Number(total) <= 0) return toast.error("Informe o valor total do acordo");
    if (Number(feePct) < 0 || Number(feePct) > 100) return toast.error("% de honorários inválido");
    setSaving(true);
    try {
      const n = paymentType === "avista" ? 1 : Math.max(1, Number(installmentsCount || 1));
      const payload = {
        company_id: companyId,
        lead_id: lead.id,
        title, description,
        total_amount: Number(total),
        fee_percentage: Number(feePct),
        fee_amount: calc.fee,
        client_amount: calc.client,
        payment_type: paymentType,
        installments_count: n,
        first_due_date: firstDue,
        status: "active",
      };

      let agreementId = agreement?.id;
      if (agreement) {
        const { error } = await supabase.from("client_agreements").update(payload).eq("id", agreement.id);
        if (error) throw error;
        // remove parcelas pendentes para regerar
        await supabase.from("agreement_installments")
          .delete().eq("agreement_id", agreement.id).eq("status", "pending");
      } else {
        const { data, error } = await supabase
          .from("client_agreements")
          .insert({ ...payload, created_by: user.id })
          .select("id").single();
        if (error) throw error;
        agreementId = data.id;
      }

      // gera parcelas
      const installs = buildInstallments(calc.fee, n, firstDue).map((i) => ({
        ...i,
        company_id: companyId,
        agreement_id: agreementId,
      }));
      const { error: instErr } = await supabase.from("agreement_installments").insert(installs);
      if (instErr) throw instErr;

      toast.success(agreement ? "Acordo atualizado" : "Acordo criado");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agreement ? "Editar acordo" : "Novo acordo"} — {lead?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Acordo INSS" />
            </div>
            <div>
              <Label>Valor total do acordo (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={total} onChange={(e) => setTotal(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Honorários (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" value={feePct} onChange={(e) => setFeePct(e.target.value)} />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avista">À vista</SelectItem>
                  <SelectItem value="parcelado">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentType === "parcelado" && (
              <div>
                <Label>Nº de parcelas</Label>
                <Input type="number" min="2" max="60" value={installmentsCount} onChange={(e) => setInstallmentsCount(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <Label>Vencimento {paymentType === "parcelado" ? "da 1ª parcela" : ""}</Label>
            <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
          </div>

          <Card className="bg-muted/40 border-dashed">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calculator className="h-4 w-4 text-primary" />
                Cálculo automático
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Valor total</p>
                  <p className="font-semibold">{brl(total || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Honorários ({feePct || 0}%) <span className="text-success">→ receita</span></p>
                  <p className="font-semibold text-success">{brl(calc.fee)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliente recebe</p>
                  <p className="font-semibold">{brl(calc.client)}</p>
                </div>
              </div>
              {paymentType === "parcelado" && previewInstallments.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Parcelas dos honorários:</p>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {previewInstallments.map((p) => (
                      <span key={p.installment_number} className="px-2 py-0.5 bg-card border rounded">
                        {p.installment_number}/{previewInstallments.length} · {brl(p.amount)} · {new Date(p.due_date+"T12:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground pt-1">
                💡 Apenas o valor de honorários entra como receita do escritório. O valor do cliente é apenas registrado.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : (agreement ? "Salvar alterações" : "Criar acordo")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
