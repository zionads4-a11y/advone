import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Edit, Sparkles, Copy, Printer } from "lucide-react";
import {
  ALL_VARIABLES,
  DOCUMENT_CATEGORIES,
  SAMPLE_TEMPLATES,
  extractPlaceholders,
} from "@/lib/documentTemplates";
import { QuickGenerateDocDialog } from "@/components/clients/QuickGenerateDocDialog";

interface Template {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export default function DocumentTemplates() {
  const { user, userRole } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [quickGenTemplate, setQuickGenTemplate] = useState<Template | null>(null);

  // form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("outros");
  const [content, setContent] = useState("");

  useEffect(() => {
    bootstrap();
  }, [user]);

  const bootstrap = async () => {
    if (!user) return;
    setLoading(true);
    const { data: cc } = await supabase
      .from("client_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const cid = cc?.company_id;
    if (!cid) {
      setLoading(false);
      return;
    }
    setCompanyId(cid);
    const { data } = await supabase
      .from("document_templates")
      .select("*")
      .eq("company_id", cid)
      .order("created_at", { ascending: false });
    setTemplates((data as any) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setName(""); setDescription(""); setCategory("outros"); setContent("");
    setOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name); setDescription(t.description || ""); setCategory(t.category); setContent(t.content);
    setOpen(true);
  };

  const insertSample = (sampleIdx: number) => {
    const s = SAMPLE_TEMPLATES[sampleIdx];
    setName(s.name); setDescription(s.description); setCategory(s.category); setContent(s.content);
  };

  const insertVariable = (key: string) => {
    setContent((c) => c + `{{${key}}}`);
  };

  const save = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Nome e conteúdo são obrigatórios");
      return;
    }
    if (!companyId || !user) return;
    const variables = extractPlaceholders(content);
    if (editing) {
      const { error } = await supabase
        .from("document_templates")
        .update({ name, description, category, content, variables: variables as any })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Modelo atualizado");
    } else {
      const { error } = await supabase.from("document_templates").insert({
        company_id: companyId,
        name, description, category, content,
        variables: variables as any,
        created_by: user.id,
      });
      if (error) return toast.error(error.message);
      toast.success("Modelo criado");
    }
    setOpen(false);
    bootstrap();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este modelo?")) return;
    const { error } = await supabase.from("document_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Modelo excluído");
    bootstrap();
  };

  const placeholders = extractPlaceholders(content);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando modelos...</div>;

  if (!companyId) {
    return <Alert><AlertDescription>Você precisa estar vinculado a uma empresa para gerenciar modelos.</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Modelos de Documentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie modelos com variáveis como <code className="px-1 bg-muted rounded">{"{{nome}}"}</code>, <code className="px-1 bg-muted rounded">{"{{cpf}}"}</code> e gere documentos automaticamente para cada cliente.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo modelo</Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhum modelo ainda. Comece com um modelo pronto:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SAMPLE_TEMPLATES.map((s, i) => (
                <Button key={i} variant="outline" size="sm" onClick={() => { openNew(); setTimeout(() => insertSample(i), 50); }}>
                  <Sparkles className="h-3 w-3 mr-1" />{s.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="outline" className="capitalize text-[10px]">{t.category}</Badge>
                </div>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-3 line-clamp-3 whitespace-pre-wrap">{t.content.slice(0, 180)}...</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(t.variables || []).slice(0, 4).map((v) => (
                    <Badge key={v} variant="secondary" className="text-[10px]">{`{{${v}}}`}</Badge>
                  ))}
                  {(t.variables || []).length > 4 && (
                    <Badge variant="secondary" className="text-[10px]">+{t.variables.length - 4}</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => setQuickGenTemplate(t)} className="flex-1">
                    <Printer className="h-3 w-3 mr-1" />Gerar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar modelo" : "Novo modelo de documento"}</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-[1fr_240px] gap-4 overflow-hidden flex-1">
            <div className="space-y-3 overflow-y-auto pr-2">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Nome do modelo *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Procuração padrão" />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quando usar este modelo" />
              </div>

              {!editing && (
                <div className="border rounded-md p-3 bg-muted/30">
                  <p className="text-xs font-medium mb-2">📋 Modelos prontos:</p>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_TEMPLATES.map((s, i) => (
                      <Button key={i} type="button" size="sm" variant="outline" onClick={() => insertSample(i)}>
                        {s.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Conteúdo *</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={18}
                  className="font-mono text-xs"
                  placeholder={"Use variáveis como {{nome}}, {{cpf}}, {{endereco_completo}}..."}
                />
                {placeholders.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Variáveis detectadas: {placeholders.map((p) => <code key={p} className="px-1 mx-0.5 bg-muted rounded">{`{{${p}}}`}</code>)}
                  </p>
                )}
              </div>
            </div>

            <div className="border-l pl-3 overflow-hidden flex flex-col">
              <Label className="mb-2">Inserir variável</Label>
              <ScrollArea className="flex-1 pr-2">
                <div className="space-y-3">
                  {[
                    { title: "Cliente", items: ALL_VARIABLES.filter((v) => v.source === "lead") },
                    { title: "Escritório", items: ALL_VARIABLES.filter((v) => v.source === "company") },
                    { title: "Sistema", items: ALL_VARIABLES.filter((v) => v.source === "system") },
                  ].map((g) => (
                    <div key={g.title}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{g.title}</p>
                      <div className="space-y-1">
                        {g.items.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => insertVariable(v.key)}
                            className="w-full text-left text-xs p-1.5 rounded hover:bg-accent transition flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-primary">{`{{${v.key}}}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar" : "Criar modelo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
