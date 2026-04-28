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
import { FileDown, Printer, Sparkles, Loader2 } from "lucide-react";
import {
  buildAutoValues,
  renderTemplate,
  extractPlaceholders,
  ALL_VARIABLES,
  SAMPLE_TEMPLATES,
} from "@/lib/documentTemplates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: any;
  companyId: string;
  onGenerated?: () => void;
}

// Categorias do "pacote completo"
const PACKAGE_CATEGORIES = ["procuracao", "contrato", "declaracao"] as const;

export function GenerateDocumentDialog({ open, onOpenChange, lead: leadProp, companyId, onGenerated }: Props) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [company, setCompany] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState("");
  const [missingManual, setMissingManual] = useState<string[]>([]);
  const [packageRunning, setPackageRunning] = useState(false);
  const [lead, setLead] = useState<any>(leadProp);

  const selected = templates.find((t) => t.id === selectedId);

  useEffect(() => {
    if (open) load();
  }, [open]);

  // Garante que os 3 modelos do pacote (procuração / contrato / declaração) existam.
  const ensurePackageTemplates = async (existing: any[]) => {
    if (!user) return existing;
    const haveCategories = new Set(existing.map((t) => t.category));
    const missing = SAMPLE_TEMPLATES.filter(
      (s) =>
        (PACKAGE_CATEGORIES as readonly string[]).includes(s.category) &&
        !haveCategories.has(s.category)
    );
    if (missing.length === 0) return existing;

    const rows = missing.map((s) => ({
      company_id: companyId,
      name: s.name,
      description: s.description,
      category: s.category,
      content: s.content,
      variables: extractPlaceholders(s.content) as any,
      created_by: user.id,
    }));
    const { data: inserted } = await supabase
      .from("document_templates")
      .insert(rows)
      .select("*");
    return [...existing, ...(inserted || [])];
  };

  const load = async () => {
    const { data: comp } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
    setCompanyName(comp?.name || "");
    setCompany(comp);

    // Profile do usuário logado (override individual de dados do advogado)
    if (user?.id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(prof);
    }

    // Busca o lead completo (com cpf, rg, endereço, estado civil, etc.)
    if (leadProp?.id) {
      const { data: full } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadProp.id)
        .maybeSingle();
      if (full) setLead({ ...leadProp, ...full });
    }

    const { data } = await supabase
      .from("document_templates")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name");
    const withPackage = await ensurePackageTemplates(data || []);
    setTemplates(withPackage);
  };

  useEffect(() => {
    if (!selected) { setPreview(""); setMissingManual([]); return; }
    const placeholders = extractPlaceholders(selected.content);
    const knownKeys = new Set(ALL_VARIABLES.map((v) => v.key));
    const missing = placeholders.filter((p) => !knownKeys.has(p));
    setMissingManual(missing);
    const values = buildAutoValues({ lead, company: company || { name: companyName }, profile, manualValues });
    setPreview(renderTemplate(selected.content, values));
  }, [selected, manualValues, lead, companyName, company, profile]);

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

  // Gera Procuração + Contrato + Declaração e marca lead como ganho/cliente.
  const generateFullPackage = async () => {
    if (!user) return;
    if (!lead?.cpf_cliente_final && !lead?.cpf) {
      toast.error("Cadastre o CPF do cliente antes de gerar o pacote.");
      return;
    }
    setPackageRunning(true);
    try {
      const values = buildAutoValues({ lead, company: company || { name: companyName }, profile, manualValues });

      // 1) Renderiza e salva os 3 documentos
      const docs = PACKAGE_CATEGORIES
        .map((cat) => templates.find((t) => t.category === cat))
        .filter(Boolean);

      if (docs.length < 3) {
        toast.error("Modelos do pacote não foram encontrados. Tente novamente.");
        setPackageRunning(false);
        return;
      }

      const rows = docs.map((t: any) => ({
        company_id: companyId,
        template_id: t.id,
        lead_id: lead.id,
        file_name: `${t.name} - ${lead.name}.txt`,
        content: renderTemplate(t.content, values),
        variables_used: manualValues as any,
        generated_by: user.id,
      }));
      const { error: docErr } = await supabase.from("generated_documents").insert(rows);
      if (docErr) throw docErr;

      // 2) Move lead p/ coluna "Ganho" + marca como cliente
      const { data: cols } = await supabase
        .from("kanban_columns")
        .select("id, is_won")
        .eq("company_id", companyId);
      const wonCol = cols?.find((c: any) => c.is_won);

      const update: any = {
        status: "won",
        is_client: true,
        became_client_at: new Date().toISOString(),
      };
      if (wonCol?.id) update.kanban_column_id = wonCol.id;

      const { error: leadErr } = await supabase.from("leads").update(update).eq("id", lead.id);
      if (leadErr) throw leadErr;

      // 3) Imprime os 3 numa única janela (sequencial)
      const w = window.open("", "_blank");
      if (w) {
        const html = rows.map((r) => `
          <section style="page-break-after:always">
            <h2 style="font-family:Georgia,serif;color:#111;margin-bottom:8px">${r.file_name.replace(/\.txt$/, "")}</h2>
            <pre style="font-family:Georgia,serif;white-space:pre-wrap;line-height:1.6;color:#111">${r.content.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>
          </section>
        `).join("");
        w.document.write(`<html><head><title>Pacote - ${lead.name}</title>
          <style>body{max-width:720px;margin:40px auto;padding:0 20px}</style>
          </head><body>${html}</body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 400);
      }

      toast.success("Pacote gerado! Lead movido para Ganho e listado em Clientes.");
      onGenerated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao gerar pacote: " + (e.message || e));
    }
    setPackageRunning(false);
  };

  const hasFullPackage = PACKAGE_CATEGORIES.every((cat) =>
    templates.some((t) => t.category === cat)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar documento para {lead?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-hidden flex-1 flex flex-col">
          {/* Pacote completo */}
          {hasFullPackage && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Fechar cliente: gerar Procuração + Contrato + Declaração
                </p>
                <p className="text-xs text-muted-foreground">
                  Salva os 3 documentos na pasta do cliente, marca o lead como <strong>Ganho</strong> e envia para a página de Clientes.
                </p>
              </div>
              <Button onClick={generateFullPackage} disabled={packageRunning} className="shrink-0">
                {packageRunning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Gerar pacote
              </Button>
            </div>
          )}

          <div>
            <Label>Modelo individual</Label>
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
