import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, RefreshCw, Loader2, Scale, ChevronRight,
  AlertCircle, CheckCircle2, Clock, XCircle, Eye, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonitoredProcess {
  id: string;
  company_id: string;
  numero_cnj: string;
  client_name: string;
  tribunal_sigla: string | null;
  client_cpf: string | null;
  classe: string | null;
  assunto: string | null;
  area: string | null;
  status_predito: string | null;
  polo_ativo: string | null;
  polo_passivo: string | null;
  data_ultima_movimentacao: string | null;
  quantidade_movimentacoes: number;
  last_checked_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Movement {
  id: string;
  movement_date: string;
  movement_type: string | null;
  content: string;
  source_name: string | null;
  source_sigla: string | null;
  source_grau: number | null;
  is_new: boolean;
}


export default function ProcessMonitoring() {
  const { user, userRole } = useAuth();
  const { companyIds } = useUserCompanies();
  const isAdmin = userRole === "admin" || userRole === "member";

  const [processes, setProcesses] = useState<MonitoredProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<MonitoredProcess | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addingProcess, setAddingProcess] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const [newCnj, setNewCnj] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientCpf, setNewClientCpf] = useState("");
  const [addCompanyId, setAddCompanyId] = useState("");

  // Company selection for admin
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
    if (isAdmin) {
      supabase.from("companies").select("id, name").then(({ data }) => {
        setCompanies((data || []) as any);
        setSelectedCompanyId("all");
      });
    } else if (companyIds.length > 0) {
      setSelectedCompanyId(companyIds[0]);
    }
  }, [isAdmin, companyIds]);

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);

    let query = supabase
      .from("monitored_processes")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!(isAdmin && selectedCompanyId === "all")) {
      query = query.eq("company_id", selectedCompanyId);
    }

    const { data } = await query;
    setProcesses((data || []) as any);
    setLoading(false);
  }, [selectedCompanyId, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchMovements = async (proc: MonitoredProcess) => {
    setSelectedProcess(proc);
    setLoadingMovements(true);
    const { data } = await supabase
      .from("process_movements")
      .select("*")
      .eq("monitored_process_id", proc.id)
      .order("movement_date", { ascending: false })
      .limit(100);
    setMovements((data || []) as any);
    setLoadingMovements(false);
  };

  const handleAddProcess = async () => {
    const targetCompanyId = isAdmin && selectedCompanyId === "all" ? addCompanyId : selectedCompanyId;
    if (!newCnj.trim() || !newClientName.trim() || !newClientCpf.trim() || !targetCompanyId) {
      toast.error("Preencha todos os campos (CNJ, Nome e CPF)");
      return;
    }
    setAddingProcess(true);
    try {
      const { data, error } = await supabase.functions.invoke("escavador-proxy", {
        body: {
          action: "add_process",
          company_id: targetCompanyId,
          numero_cnj: newCnj.trim(),
          client_name: newClientName.trim(),
          client_cpf: newClientCpf.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Processo adicionado ao monitoramento!");
      setAddDialogOpen(false);
      setNewCnj("");
      setNewClientName("");
      setNewClientCpf("");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar processo");
    }
    setAddingProcess(false);
  };

  const handleRefresh = async (proc: MonitoredProcess) => {
    setRefreshingId(proc.id);
    try {
      const { data, error } = await supabase.functions.invoke("escavador-proxy", {
        body: { action: "refresh", process_id: proc.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Dados atualizados!");
      fetchData();
      if (selectedProcess?.id === proc.id) fetchMovements(proc);
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    }
    setRefreshingId(null);
  };

  const handleRemove = async (proc: MonitoredProcess) => {
    try {
      const { data, error } = await supabase.functions.invoke("escavador-proxy", {
        body: { action: "remove", process_id: proc.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Processo removido do monitoramento");
      if (selectedProcess?.id === proc.id) {
        setSelectedProcess(null);
        setMovements([]);
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover");
    }
  };

  const statusIcon = (status: string | null) => {
    switch (status) {
      case "ATIVO": return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      case "INATIVO": return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return <Clock className="h-3.5 w-3.5 text-warning" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Monitoramento de Processos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe movimentações processuais diariamente via Escavador • <span className="font-medium text-foreground">R$ 2,50/mês por processo ativo</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Badge variant="outline" className="text-xs">
            {processes.length} processo{processes.length !== 1 ? "s" : ""} ativo{processes.length !== 1 ? "s" : ""}
          </Badge>
          <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
            R$ {(processes.length * 1.5).toFixed(2).replace(".", ",")}/mês
            <span className="ml-1 opacity-70">(R$ 1,50 × processo)</span>
          </Badge>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Processo ao Monitoramento</DialogTitle>
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mt-2">
                  <p className="text-xs text-primary font-medium flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Cobrança de R$ 1,50/mês por processo
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Cada processo ativo gera uma cobrança mensal de R$ 1,50 que será incluída na sua fatura.
                  </p>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {isAdmin && selectedCompanyId === "all" && (
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Select value={addCompanyId} onValueChange={setAddCompanyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Número CNJ</Label>
                  <Input
                    placeholder="0000000-00.0000.0.00.0000"
                    value={newCnj}
                    onChange={(e) => setNewCnj(e.target.value)}
                    maxLength={25}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ do Cliente</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={newClientCpf}
                    onChange={(e) => setNewClientCpf(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <Button onClick={handleAddProcess} disabled={addingProcess} className="w-full">
                  {addingProcess ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Buscando no Escavador...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Buscar e Monitorar
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Processos Monitorados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : processes.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Scale className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum processo monitorado</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[calc(100vh-300px)]">
                  <div className="divide-y divide-border">
                    {processes.map((proc) => (
                      <button
                        key={proc.id}
                        onClick={() => fetchMovements(proc)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                          selectedProcess?.id === proc.id ? "bg-muted/70" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {proc.client_name}
                            </p>
                            {isAdmin && selectedCompanyId === "all" && (
                              <p className="text-[10px] text-primary/70 truncate">
                                {companies.find(c => c.id === proc.company_id)?.name || "—"}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {proc.numero_cnj}
                            </p>
                            {proc.client_cpf && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                CPF: {proc.client_cpf}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {statusIcon(proc.status_predito)}
                              {proc.tribunal_sigla && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {proc.tribunal_sigla}
                                </Badge>
                              )}
                              {proc.quantidade_movimentacoes > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {proc.quantidade_movimentacoes} mov.
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {selectedProcess ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{selectedProcess.client_name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5">
                      {selectedProcess.numero_cnj}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefresh(selectedProcess)}
                      disabled={refreshingId === selectedProcess.id}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshingId === selectedProcess.id ? "animate-spin" : ""}`} />
                      Atualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(selectedProcess)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Process info */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedProcess.tribunal_sigla && (
                    <Badge variant="outline">{selectedProcess.tribunal_sigla}</Badge>
                  )}
                  {selectedProcess.classe && (
                    <Badge variant="secondary" className="text-xs">{selectedProcess.classe}</Badge>
                  )}
                  {selectedProcess.area && (
                    <Badge variant="secondary" className="text-xs">{selectedProcess.area}</Badge>
                  )}
                  {selectedProcess.status_predito && (
                    <Badge
                      variant={selectedProcess.status_predito === "ATIVO" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {selectedProcess.status_predito}
                    </Badge>
                  )}
                </div>
                {(selectedProcess.polo_ativo || selectedProcess.polo_passivo) && (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {selectedProcess.polo_ativo && (
                      <p><span className="font-medium text-foreground">Polo Ativo:</span> {selectedProcess.polo_ativo}</p>
                    )}
                    {selectedProcess.polo_passivo && (
                      <p><span className="font-medium text-foreground">Polo Passivo:</span> {selectedProcess.polo_passivo}</p>
                    )}
                  </div>
                )}
                {selectedProcess.last_checked_at && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Última verificação: {format(new Date(selectedProcess.last_checked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <h4 className="text-sm font-semibold mb-3">Movimentações</h4>
                {loadingMovements ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma movimentação registrada
                  </p>
                ) : (
                  <ScrollArea className="max-h-[calc(100vh-500px)]">
                    <div className="space-y-3">
                      {movements.map((mov) => (
                        <div
                          key={mov.id}
                          className={`relative pl-6 pb-3 border-l-2 ${
                            mov.is_new ? "border-primary" : "border-border"
                          }`}
                        >
                          <div className={`absolute -left-1.5 top-0.5 h-3 w-3 rounded-full ${
                            mov.is_new ? "bg-primary" : "bg-border"
                          }`} />
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm text-foreground">{mov.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(mov.movement_date), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                {mov.source_sigla && (
                                  <Badge variant="outline" className="text-[9px]">
                                    {mov.source_sigla} - {mov.source_grau === 1 ? "1º grau" : "2º grau"}
                                  </Badge>
                                )}
                                {mov.is_new && (
                                  <Badge className="text-[9px] bg-primary/10 text-primary border-primary/30">
                                    NOVO
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20">
                <Eye className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Selecione um processo para ver os detalhes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
