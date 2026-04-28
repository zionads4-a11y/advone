import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Download, Trash2, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  lead: any;
  companyId: string;
}

const CATEGORIES = [
  { value: "rg", label: "RG / Identidade" },
  { value: "cpf", label: "CPF" },
  { value: "comprovante_residencia", label: "Comprovante de residência" },
  { value: "carteira_trabalho", label: "Carteira de trabalho" },
  { value: "ctps_digital", label: "CTPS digital" },
  { value: "extrato_inss", label: "Extrato INSS / CNIS" },
  { value: "carta_concessao", label: "Carta de concessão" },
  { value: "laudo_medico", label: "Laudo / Atestado médico" },
  { value: "processo", label: "Processo / Andamento" },
  { value: "contrato_assinado", label: "Contrato assinado" },
  { value: "procuracao_assinada", label: "Procuração assinada" },
  { value: "outros", label: "Outros" },
];

export function ClientUploadedDocuments({ lead, companyId }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<string>("outros");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [lead.id]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} excede 50MB`);
          continue;
        }
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${companyId}/${lead.id}/${Date.now()}_${cleanName}`;

        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          toast.error(`Erro ao enviar ${file.name}: ${upErr.message}`);
          continue;
        }

        const { error: dbErr } = await supabase.from("documents").insert({
          company_id: companyId,
          lead_id: lead.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          category,
        });
        if (dbErr) {
          await supabase.storage.from("documents").remove([path]);
          toast.error(`Erro ao registrar ${file.name}: ${dbErr.message}`);
          continue;
        }
      }
      toast.success("Upload concluído");
      await load();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const download = async (doc: any) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) return toast.error("Erro ao gerar link");
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (doc: any) => {
    if (!confirm(`Excluir "${doc.file_name}"?`)) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Documento excluído");
    load();
  };

  const formatSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label || v;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-semibold flex items-center gap-1.5"><Paperclip className="h-4 w-4" />Documentos enviados</h3>
          <p className="text-xs text-muted-foreground">RG, CPF, comprovantes, laudos, contratos assinados, etc.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFile}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            Enviar arquivo
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : docs.length === 0 ? (
        <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm">Nenhum arquivo enviado ainda.</p>
          <p className="text-xs mt-1">Selecione a categoria e clique em "Enviar arquivo".</p>
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
                    {catLabel(d.category)} · {formatSize(d.file_size)} · {format(new Date(d.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => download(d)}><Download className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(d)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
