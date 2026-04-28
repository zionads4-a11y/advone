import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, User, Scale, Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LeadProcessDataProps {
  leadId: string;
  companyId: string;
  onUpdate?: () => void;
}

export function LeadProcessData({ leadId, companyId, onUpdate }: LeadProcessDataProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Stored values (from DB)
  const [processoNumero, setProcessoNumero] = useState<string | null>(null);
  const [processoValor, setProcessoValor] = useState<number | null>(null);
  
  // Form values (editing)
  const [formProcesso, setFormProcesso] = useState("");
  const [formValor, setFormValor] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("processo_numero, processo_valor")
      .eq("id", leadId)
      .maybeSingle();
    
    if (data) {
      const d = data as any;
      setProcessoNumero(d.processo_numero || null);
      setProcessoValor(d.processo_valor || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const startEditing = () => {
    setFormProcesso(processoNumero || "");
    setFormValor(processoValor ? String(processoValor) : "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const cleanProcesso = formProcesso.trim().slice(0, 50);
    const parsedValor = parseFloat(formValor.replace(",", ".")) || 0;

    const { error } = await supabase
      .from("leads")
      .update({
        processo_numero: cleanProcesso || null,
        processo_valor: parsedValor,
      } as any)
      .eq("id", leadId);

    if (error) {
      console.error("Erro ao salvar dados do processo:", error);
      toast.error("Erro ao salvar: " + error.message);
    } else {
      // Update local state immediately
      setProcessoNumero(cleanProcesso || null);
      setProcessoValor(parsedValor);
      toast.success("Dados do processo atualizados!");
      onUpdate?.();
    }
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dados do Processo
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dados do Processo
          </h4>
          <button
            onClick={startEditing}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Editar dados do processo"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {processoNumero ? (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Processo: {processoNumero}
            </div>
          ) : null}
          {(processoValor ?? 0) > 0 ? (
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <Scale className="h-3.5 w-3.5" />
              Valor: R$ {Number(processoValor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          ) : null}
          {!processoNumero && !(processoValor ?? 0) && (
            <button
              onClick={startEditing}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clique para adicionar dados do processo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Dados do Processo
      </h4>
      <div className="space-y-2.5">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nº do Processo</Label>
          <Input
            value={formProcesso}
            onChange={(e) => setFormProcesso(e.target.value)}
            placeholder="0000000-00.0000.0.00.0000"
            className="h-8 text-sm"
            maxLength={50}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Valor do Processo (R$)</Label>
          <Input
            value={formValor}
            onChange={(e) => setFormValor(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
          {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs">
          <X className="h-3 w-3 mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
