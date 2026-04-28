import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { buildAutoValues, renderTemplate } from "@/lib/documentTemplates";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: { id: string; name: string; content: string } | null;
  companyId: string;
}

const ESTADO_CIVIL_OPTIONS = [
  "solteiro(a)",
  "casado(a)",
  "divorciado(a)",
  "viúvo(a)",
  "união estável",
];

export function QuickGenerateDocDialog({ open, onOpenChange, template, companyId }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    nacionalidade: "brasileiro(a)",
    estado_civil: "",
    profissao: "",
    telefone: "",
    endereco_completo: "",
  });

  useEffect(() => {
    if (!open || !companyId) return;
    supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data }) => setCompanyName(data?.name || ""));
  }, [open, companyId]);

  const preview = useMemo(() => {
    if (!template) return "";
    const lead = {
      name: form.nome,
      cpf_cliente_final: form.cpf,
      nacionalidade: form.nacionalidade,
      estado_civil: form.estado_civil,
      profissao: form.profissao,
      phone: form.telefone,
      whatsapp: form.telefone,
      endereco_rua: form.endereco_completo,
    };
    const values = buildAutoValues({ lead, company: { name: companyName } });
    // Sobrescrever endereco_completo pelo texto livre do usuário
    values.endereco_completo = form.endereco_completo;
    return renderTemplate(template.content, values);
  }, [template, form, companyName]);

  const printPdf = () => {
    if (!template) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const safe = preview.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    w.document.write(`<html><head><title>${template.name}</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;white-space:pre-wrap;color:#111}</style>
      </head><body>${safe}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar: {template?.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 overflow-hidden flex-1">
          <div className="space-y-3 overflow-y-auto pr-2">
            <p className="text-xs text-muted-foreground">Preencha os dados do cliente:</p>
            <div>
              <Label>Nome completo *</Label>
              <Input value={form.nome} onChange={(e) => update("nome", e.target.value)} placeholder="João da Silva" />
            </div>
            <div>
              <Label>CPF *</Label>
              <Input value={form.cpf} onChange={(e) => update("cpf", e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div>
              <Label>Endereço completo *</Label>
              <Input
                value={form.endereco_completo}
                onChange={(e) => update("endereco_completo", e.target.value)}
                placeholder="Rua X, 123, Bairro, Cidade - UF, CEP"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nacionalidade</Label>
                <Input value={form.nacionalidade} onChange={(e) => update("nacionalidade", e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Estado civil</Label>
                <Select value={form.estado_civil} onValueChange={(v) => update("estado_civil", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {ESTADO_CIVIL_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Profissão</Label>
                <Input value={form.profissao} onChange={(e) => update("profissao", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-l pl-3 overflow-hidden flex flex-col">
            <Label className="mb-2">Pré-visualização</Label>
            <ScrollArea className="flex-1 border rounded-md bg-card">
              <pre className="p-3 text-[11px] whitespace-pre-wrap font-serif leading-relaxed">{preview}</pre>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={printPdf} disabled={!form.nome.trim() || !form.cpf.trim()}>
            <Printer className="h-4 w-4 mr-1" />Criar documento (PDF)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
