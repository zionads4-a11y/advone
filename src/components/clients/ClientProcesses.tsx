import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Plus, Bell, Loader2, Trash2, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  leadId: string;
  leadName: string;
  companyId: string;
  onChanged?: () => void;
}

interface ProcessItem {
  id: string;            // monitored_processes.id
  case_id: string | null;
  numero_cnj: string;
  classe: string | null;
  tribunal_sigla: string | null;
  data_ultima_movimentacao: string | null;
  last_checked_at: string | null;
}

interface Movement {
  id: string;
  movement_date: string | null;
  movement_type: string | null;
  content: string | null;
  source_name: string | null;
  is_new: boolean;
  created_at: string;
}

export function ClientProcesses({ leadId, leadName, companyId, onChanged }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ProcessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [cnj, setCnj] = useState("");
  const [movements, setMovements] = useState<Record<string, Movement[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newCounts, setNewCounts] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    // Busca cases do lead que tenham case_number
    const { data: cases } = await supabase
      .from("cases")
      .select("id, case_number")
      .eq("lead_id", leadId)
      .eq("company_id", companyId);

    const caseIds = (cases || []).map((c) => c.id);
    const cnjs = (cases || []).map((c) => c.case_number).filter(Boolean) as string[];

    // Busca processos monitorados associados (por case_id ou por CNJ + company)
    let procs: ProcessItem[] = [];
    if (caseIds.length > 0 || cnjs.length > 0) {
      const { data: byCase } = await supabase
        .from("monitored_processes")
        .select("id, case_id, numero_cnj, classe, tribunal_sigla, data_ultima_movimentacao, last_checked_at")
        .eq("company_id", companyId)
        .or(
          [
            caseIds.length ? `case_id.in.(${caseIds.join(",")})` : "",
            cnjs.length ? `numero_cnj.in.(${cnjs.map((c) => `"${c}"`).join(",")})` : "",
          ].filter(Boolean).join(",")
        );
      procs = (byCase || []) as ProcessItem[];
    }

    // dedup
    const seen = new Set<string>();
    procs = procs.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

    setItems(procs);

    // Conta movimentos novos por processo
    if (procs.length > 0) {
      const ids = procs.map((p) => p.id);
      const { data: news } = await supabase
        .from("process_movements")
        .select("monitored_process_id")
        .in("monitored_process_id", ids)
        .eq("is_new", true);
      const counts: Record<string, number> = {};
      (news || []).forEach((m: any) => {
        counts[m.monitored_process_id] = (counts[m.monitored_process_id] || 0) + 1;
      });
      setNewCounts(counts);
    } else {
      setNewCounts({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [leadId, companyId]);

  const onlyDigits = (s: string) => s.replace(/\D/g, "");
  const formatCnj = (s: string) => {
    const d = onlyDigits(s);
    if (d.length !== 20) return s;
    return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16,20)}`;
  };

  const addProcess = async () => {
    const digits = onlyDigits(cnj);
    if (digits.length !== 20) {
      toast.error("CNJ inválido. Deve ter 20 dígitos.");
      return;
    }
    if (!user) return;
    setAdding(true);
    try {
      const numero = formatCnj(digits);

      // 1) cria ou reaproveita case
      const { data: existingCase } = await supabase
        .from("cases")
        .select("id")
        .eq("lead_id", leadId)
        .eq("case_number", numero)
        .maybeSingle();

      let caseId = existingCase?.id;
      if (!caseId) {
        const { data: newCase, error: caseErr } = await supabase
          .from("cases")
          .insert({
            company_id: companyId,
            lead_id: leadId,
            client_name: leadName,
            case_number: numero,
            status: "ativo",
            created_by: user.id,
          })
          .select("id")
          .single();
        if (caseErr) throw caseErr;
        caseId = newCase.id;
      }

      // 2) cria ou reaproveita monitored_process
      const { data: existingProc } = await supabase
        .from("monitored_processes")
        .select("id")
        .eq("company_id", companyId)
        .eq("numero_cnj", numero)
        .maybeSingle();

      if (!existingProc) {
        const { error: procErr } = await supabase
          .from("monitored_processes")
          .insert({
            company_id: companyId,
            case_id: caseId,
            numero_cnj: numero,
            client_name: leadName,
            is_active: true,
          });
        if (procErr) throw procErr;
      } else {
        // garante vínculo do case_id
        await supabase
          .from("monitored_processes")
          .update({ case_id: caseId, is_active: true })
          .eq("id", existingProc.id);
      }

      // Atualiza processo_numero do lead se estiver vazio
      await supabase
        .from("leads")
        .update({ processo_numero: numero })
        .eq("id", leadId)
        .is("processo_numero", null);

      toast.success("Processo cadastrado e em monitoramento");
      setCnj("");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error("Erro: " + (e.message || e));
    }
    setAdding(false);
  };

  const removeProcess = async (p: ProcessItem) => {
    if (!confirm(`Remover monitoramento do processo ${p.numero_cnj}?`)) return;
    const { error } = await supabase
      .from("monitored_processes")
      .update({ is_active: false })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Monitoramento desativado");
    load();
    onChanged?.();
  };

  const toggleMovements = async (p: ProcessItem) => {
    const isOpen = expanded[p.id];
    setExpanded((s) => ({ ...s, [p.id]: !isOpen }));
    if (!isOpen && !movements[p.id]) {
      const { data } = await supabase
        .from("process_movements")
        .select("*")
        .eq("monitored_process_id", p.id)
        .order("movement_date", { ascending: false })
        .limit(50);
      setMovements((s) => ({ ...s, [p.id]: (data || []) as Movement[] }));
    }
  };

  const markRead = async (p: ProcessItem) => {
    await supabase
      .from("process_movements")
      .update({ is_new: false })
      .eq("monitored_process_id", p.id)
      .eq("is_new", true);
    setNewCounts((s) => ({ ...s, [p.id]: 0 }));
    toast.success("Movimentos marcados como lidos");
    onChanged?.();
  };

  const checkNow = async (p: ProcessItem) => {
    setRefreshing(p.id);
    try {
      const { error } = await supabase.functions.invoke("escavador-check-process", {
        body: { monitored_process_id: p.id },
      });
      if (error) throw error;
      toast.success("Verificação solicitada");
      await load();
    } catch (e: any) {
      // Fallback: apenas recarrega
      toast.message("Aguarde a próxima verificação automática");
    }
    setRefreshing(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-1.5">
          <Briefcase className="h-4 w-4" />
          Processos do cliente
        </h3>
        <p className="text-xs text-muted-foreground">
          Cadastre o número CNJ. O sistema monitora automaticamente novos andamentos.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs">Número do processo (CNJ)</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="0000000-00.0000.0.00.0000"
              value={cnj}
              onChange={(e) => setCnj(e.target.value)}
              onBlur={() => setCnj((v) => formatCnj(v))}
            />
            <Button onClick={addProcess} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Adicionar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cole o número e clique em Adicionar. Aceita com ou sem máscara.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed rounded-md p-6 text-center text-muted-foreground text-sm">
          Nenhum processo cadastrado para este cliente.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => {
            const newCount = newCounts[p.id] || 0;
            const isOpen = expanded[p.id];
            return (
              <Card key={p.id} className={newCount > 0 ? "border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/10" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{p.numero_cnj}</span>
                        {p.tribunal_sigla && <Badge variant="outline" className="text-[10px]">{p.tribunal_sigla}</Badge>}
                        {newCount > 0 && (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                            <Bell className="h-3 w-3" />
                            {newCount} {newCount === 1 ? "novo movimento" : "novos movimentos"}
                          </Badge>
                        )}
                      </div>
                      {p.classe && <p className="text-xs text-muted-foreground mt-0.5">{p.classe}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Última movimentação: {p.data_ultima_movimentacao ? format(new Date(p.data_ultima_movimentacao), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        {p.last_checked_at && <> · verificado em {format(new Date(p.last_checked_at), "dd/MM HH:mm", { locale: ptBR })}</>}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => checkNow(p)} disabled={refreshing === p.id} title="Verificar agora">
                        {refreshing === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleMovements(p)}>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeProcess(p)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 border-t pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-medium">Movimentos</p>
                        {newCount > 0 && (
                          <Button size="sm" variant="outline" onClick={() => markRead(p)}>
                            Marcar como lidos
                          </Button>
                        )}
                      </div>
                      {(movements[p.id] || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum movimento registrado ainda.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-80 overflow-y-auto">
                          {(movements[p.id] || []).map((m) => (
                            <div
                              key={m.id}
                              className={`text-xs p-2 rounded border ${m.is_new ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/10" : "border-border bg-muted/30"}`}
                            >
                              <div className="flex justify-between gap-2 mb-1">
                                <span className="font-medium">{m.movement_type || "Movimento"}</span>
                                <span className="text-muted-foreground">
                                  {m.movement_date ? format(new Date(m.movement_date), "dd/MM/yyyy", { locale: ptBR }) : ""}
                                </span>
                              </div>
                              {m.content && <p className="whitespace-pre-wrap text-muted-foreground">{m.content}</p>}
                              {m.source_name && <p className="text-[10px] text-muted-foreground mt-1">{m.source_name}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
