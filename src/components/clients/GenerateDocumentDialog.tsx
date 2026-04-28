import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { FileDown, Printer } from "lucide-react";
import {
  buildAutoValues,
  renderTemplate,
  extractPlaceholders,
  ALL_VARIABLES,
} from "@/lib/documentTemplates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: any;
  companyId: string;
  onGenerated?: () => void;
}

export function GenerateDocumentDialog({ open, onOpenChange, lead, companyId, onGenerated }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState("");
  const [missingManual, setMissingManual] = useState<string[]>([]);

  const selected = templates.find((t) => t.id === selectedId);

  useEffect(() => {
    if (open) load();
  }, [open]);

  const load = async () => {
    const { data: comp } = await supabase.from("companies").select("name").eq("id", companyId).maybeSingle();
    setCompanyName(comp?.name || "");
    const { data } = await supabase
      .from("document_templates")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name");
    setTemplates(data || []);
  };

  useEffect(() => {
    if (!selected) { setPreview(""); setMissingManual([]); return; }
    const placeholders = extractPlaceholders(selected.content);
    const knownKeys = new Set(ALL_VARIABLES.map((v) => v.key));
    const missing = placeholders.filter((p) => !knownKeys.has(p));
    setMissingManual(missing);
    const values = buildAutoValues({ lead, company: { name: companyName }, manualValues });
    setPreview(renderTemplate(selected.content, values));
  }, [selected, manualValues, lead, companyName]);

  const save = async () => {
    if (!selected || !user) return;
    const fileName = `${selected.name} - ${lead.name}.txt`;
    const { error } = await supabase.from("generated_documents").insert({
      company_id: companyId,
      template_id: selected.id,
      lead_id: lead.id,
      file_name: fileName,
      content: preview,
      variables_used: manualValues as any,
      generated_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Documento gerado e salvo");
    onGenerated?.();
    onOpenChange(false);
  };

  const printPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${selected?.name || "Documento"}</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;white-space:pre-wrap;color:#111}</style>
      </head><body>${preview.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar documento para {lead?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-hidden flex-1 flex flex-col">
          <div>
            <Label>Modelo</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Escolha um modelo..." /></SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum modelo cadastrado.</div>
                ) : templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {missingManual.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/30 space-y-2">
              <p className="text-xs font-medium">Variáveis manuais (não encontradas no cadastro):</p>
              {missingManual.map((k) => (
                <div key={k} className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs font-mono">{`{{${k}}}`}</Label>
                  <Input
                    value={manualValues[k] || ""}
                    onChange={(e) => setManualValues({ ...manualValues, [k]: e.target.value })}
                    placeholder={`Valor para ${k}`}
                  />
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Label className="mb-1">Pré-visualização</Label>
              <ScrollArea className="flex-1 border rounded-md bg-card">
                <pre className="p-4 text-xs whitespace-pre-wrap font-serif leading-relaxed">{preview}</pre>
              </ScrollArea>
              {preview.includes("___") && (
                <Alert className="mt-2">
                  <AlertDescription className="text-xs">
                    Algumas variáveis aparecem como <code>___xxx___</code> — preencha os dados do cliente para que sejam substituídas.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={printPdf} disabled={!selected}>
            <Printer className="h-4 w-4 mr-1" />Imprimir / PDF
          </Button>
          <Button onClick={save} disabled={!selected}>
            <FileDown className="h-4 w-4 mr-1" />Salvar documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
