import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Eye, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { GenerateDocumentDialog } from "./GenerateDocumentDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  lead: any;
  companyId: string;
}

export function ClientGeneratedDocuments({ lead, companyId }: Props) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genOpen, setGenOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("generated_documents")
      .select("*")
      .eq("lead_id", lead.id)
      .order("generated_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [lead.id]);

  const remove = async (id: string) => {
    if (!confirm("Excluir este documento?")) return;
    const { error } = await supabase.from("generated_documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Documento excluído");
    load();
  };

  const printDoc = (doc: any) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${doc.file_name}</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;white-space:pre-wrap;color:#111}</style>
      </head><body>${(doc.content || "").replace(/&/g,"&amp;").replace(/</g,"&lt;")}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Documentos gerados</h3>
          <p className="text-xs text-muted-foreground">Procurações, contratos e declarações criadas para este cliente.</p>
        </div>
        <Button size="sm" onClick={() => setGenOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Gerar documento
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : docs.length === 0 ? (
        <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm">Nenhum documento gerado ainda.</p>
          <p className="text-xs mt-1">Cadastre modelos em <strong>Modelos de Documentos</strong> e gere automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 p-3 border rounded-md hover:bg-accent/30 transition">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(d.generated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setViewing(d)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => printDoc(d)}><Printer className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <GenerateDocumentDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        lead={lead}
        companyId={companyId}
        onGenerated={load}
      />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewing?.file_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 border rounded-md bg-card">
            <pre className="p-4 text-xs whitespace-pre-wrap font-serif leading-relaxed">{viewing?.content}</pre>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => printDoc(viewing)}><Printer className="h-4 w-4 mr-1" />Imprimir / PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
