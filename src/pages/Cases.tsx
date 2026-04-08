import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FolderOpen,
  Plus,
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  Search,
  FileText,
  File,
  Pencil,
  Briefcase,
  Hash,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CaseTimeline } from "@/components/cases/CaseTimeline";

interface CaseRecord {
  id: string;
  company_id: string;
  client_name: string;
  case_number: string | null;
  lead_id: string | null;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  doc_count?: number;
  lead_name?: string;
}

interface LeadOption {
  id: string;
  name: string;
}

interface CaseDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  category: string;
  notes: string | null;
  created_at: string;
}

const DOC_CATEGORIES = [
  { value: "peticao", label: "Petição" },
  { value: "procuracao", label: "Procuração" },
  { value: "contrato", label: "Contrato" },
  { value: "documento_pessoal", label: "Documento Pessoal" },
  { value: "comprovante", label: "Comprovante" },
  { value: "laudo", label: "Laudo / Parecer" },
  { value: "sentenca", label: "Sentença / Decisão" },
  { value: "outros", label: "Outros" },
];

function getCategoryLabel(value: string) {
  return DOC_CATEGORIES.find((c) => c.value === value)?.label || value;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Cases() {
  const { user, userRole } = useAuth();
  const { companyIds } = useUserCompanies();
  const companyId = companyIds[0] || "";

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Selected case (folder view)
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Create case dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseRecord | null>(null);
  const [formClientName, setFormClientName] = useState("");
  const [formCaseNumber, setFormCaseNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("ativo");
  const [formLeadId, setFormLeadId] = useState<string>("none");

  // Leads for linking
  const [companyLeads, setCompanyLeads] = useState<LeadOption[]>([]);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("peticao");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const canDelete = userRole === "admin" || userRole === "gerente";
  const canEdit = userRole === "admin" || userRole === "gerente";

  const fetchCases = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar processos");
      setLoading(false);
      return;
    }

    // Get doc counts
    const caseIds = (data || []).map((c: any) => c.id);
    let docCounts: Record<string, number> = {};

    if (caseIds.length > 0) {
      const { data: docs } = await supabase
        .from("documents")
        .select("case_id")
        .in("case_id", caseIds);

      if (docs) {
        docs.forEach((d: any) => {
          if (d.case_id) docCounts[d.case_id] = (docCounts[d.case_id] || 0) + 1;
        });
      }
    }

    setCases(
      (data || []).map((c: any) => ({
        ...c,
        doc_count: docCounts[c.id] || 0,
      }))
    );
    setLoading(false);
  }, [companyId]);

  const fetchCaseDocuments = useCallback(async (caseId: string) => {
    setLoadingDocs(true);
    const { data } = await supabase
      .from("documents")
      .select("id, file_name, file_path, file_size, category, notes, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    setCaseDocuments((data || []) as CaseDocument[]);
    setLoadingDocs(false);
  }, []);

  useEffect(() => {
    if (companyId) fetchCases();
  }, [companyId, fetchCases]);

  useEffect(() => {
    if (selectedCase) fetchCaseDocuments(selectedCase.id);
  }, [selectedCase, fetchCaseDocuments]);

  const handleCreateCase = async () => {
    if (!user || !companyId || !formClientName.trim()) return;

    const payload = {
      company_id: companyId,
      client_name: formClientName.trim(),
      case_number: formCaseNumber.trim() || null,
      notes: formNotes.trim() || null,
      status: formStatus,
      created_by: user.id,
    };

    if (editingCase) {
      const { error } = await supabase
        .from("cases")
        .update(payload)
        .eq("id", editingCase.id);
      if (error) return toast.error("Erro: " + error.message);
      toast.success("Processo atualizado!");
      if (selectedCase?.id === editingCase.id) {
        setSelectedCase({ ...selectedCase, ...payload } as CaseRecord);
      }
    } else {
      const { error } = await supabase.from("cases").insert(payload);
      if (error) return toast.error("Erro: " + error.message);
      toast.success("Processo criado!");
    }

    resetCaseForm();
    setCreateOpen(false);
    setEditingCase(null);
    fetchCases();
  };

  const resetCaseForm = () => {
    setFormClientName("");
    setFormCaseNumber("");
    setFormNotes("");
    setFormStatus("ativo");
  };

  const openEditCase = (c: CaseRecord) => {
    setEditingCase(c);
    setFormClientName(c.client_name);
    setFormCaseNumber(c.case_number || "");
    setFormNotes(c.notes || "");
    setFormStatus(c.status);
    setCreateOpen(true);
  };

  const handleDeleteCase = async (c: CaseRecord) => {
    // Delete associated documents from storage first
    const { data: docs } = await supabase
      .from("documents")
      .select("file_path")
      .eq("case_id", c.id);

    if (docs && docs.length > 0) {
      await supabase.storage
        .from("documents")
        .remove(docs.map((d: any) => d.file_path));
      await supabase.from("documents").delete().eq("case_id", c.id);
    }

    const { error } = await supabase.from("cases").delete().eq("id", c.id);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Processo excluído!");
    if (selectedCase?.id === c.id) setSelectedCase(null);
    fetchCases();
  };

  const handleUploadDoc = async () => {
    if (!selectedFile || !user || !companyId || !selectedCase) return;
    if (selectedFile.size > 600 * 1024 * 1024) {
      return toast.error("Arquivo muito grande. Máximo: 600MB");
    }

    setUploading(true);
    try {
      const filePath = `${companyId}/cases/${selectedCase.id}/${Date.now()}_${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile, { contentType: selectedFile.type });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        company_id: companyId,
        uploaded_by: user.id,
        case_id: selectedCase.id,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        category: uploadCategory,
        notes: uploadNotes || null,
      });

      if (insertError) throw insertError;

      toast.success("Documento enviado!");
      setUploadOpen(false);
      setSelectedFile(null);
      setUploadCategory("peticao");
      setUploadNotes("");
      fetchCaseDocuments(selectedCase.id);
      fetchCases(); // update doc count
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: CaseDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.file_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error("Erro ao baixar: " + err.message);
    }
  };

  const handleDeleteDoc = async (doc: CaseDocument) => {
    try {
      await supabase.storage.from("documents").remove([doc.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      toast.success("Documento excluído!");
      if (selectedCase) fetchCaseDocuments(selectedCase.id);
      fetchCases();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.client_name.toLowerCase().includes(term) ||
      (c.case_number || "").toLowerCase().includes(term)
    );
  });

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma empresa vinculada ao seu perfil.
      </div>
    );
  }

  // === FOLDER VIEW (inside a case) ===
  if (selectedCase) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCase(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {selectedCase.client_name}
                </h1>
                <Badge
                  variant={selectedCase.status === "ativo" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {selectedCase.status === "ativo" ? "Ativo" : selectedCase.status === "arquivado" ? "Arquivado" : selectedCase.status}
                </Badge>
              </div>
              {selectedCase.case_number && (
                <p className="text-sm text-muted-foreground">
                  Processo nº {selectedCase.case_number}
                </p>
              )}
              {selectedCase.notes && (
                <p className="text-xs text-muted-foreground mt-1">{selectedCase.notes}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => openEditCase(selectedCase)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar documento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar documento ao processo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Arquivo (PDF, DOC, DOCX, JPG — máx. 600MB)</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    {selectedFile && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observações (opcional)</Label>
                    <Textarea
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleUploadDoc} className="w-full" disabled={!selectedFile || uploading}>
                    {uploading ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Documents table */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDocs ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : caseDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <File className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      Nenhum documento neste processo
                    </TableCell>
                  </TableRow>
                ) : (
                  caseDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {doc.file_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {getCategoryLabel(doc.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {doc.notes || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDoc(doc)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <CaseTimeline caseId={selectedCase.id} companyId={companyId} />
          </CardContent>
        </Card>

        {/* Edit case dialog (reused) */}
        <Dialog
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) { resetCaseForm(); setEditingCase(null); }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCase ? "Editar processo" : "Novo processo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do cliente *</Label>
                <Input value={formClientName} onChange={(e) => setFormClientName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <Label>Número do processo</Label>
                <Input value={formCaseNumber} onChange={(e) => setFormCaseNumber(e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="arquivado">Arquivado</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
              </div>
              <Button onClick={handleCreateCase} className="w-full" disabled={!formClientName.trim()}>
                {editingCase ? "Salvar alterações" : "Criar processo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === LIST VIEW (folders) ===
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Processos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os processos e documentos de cada cliente</p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) { resetCaseForm(); setEditingCase(null); }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo processo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCase ? "Editar processo" : "Novo processo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do cliente *</Label>
                <Input value={formClientName} onChange={(e) => setFormClientName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <Label>Número do processo</Label>
                <Input value={formCaseNumber} onChange={(e) => setFormCaseNumber(e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="arquivado">Arquivado</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
              </div>
              <Button onClick={handleCreateCase} className="w-full" disabled={!formClientName.trim()}>
                {editingCase ? "Salvar alterações" : "Criar processo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou número do processo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Folder grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredCases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Briefcase className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">
            {searchTerm ? "Nenhum processo encontrado" : "Nenhum processo cadastrado"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCases.map((c) => (
            <Card
              key={c.id}
              className="glass-card cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] group"
              onClick={() => setSelectedCase(c)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {c.client_name}
                      </h3>
                      <Badge
                        variant={c.status === "ativo" ? "default" : "secondary"}
                        className="text-[9px] shrink-0"
                      >
                        {c.status === "ativo" ? "Ativo" : c.status === "arquivado" ? "Arquivado" : c.status}
                      </Badge>
                    </div>
                    {c.case_number && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Hash className="h-3 w-3" />
                        {c.case_number}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {c.doc_count || 0} doc{(c.doc_count || 0) !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCase(c);
                      }}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCase(c);
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
