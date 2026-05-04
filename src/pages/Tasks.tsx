import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Plus, Calendar, AlertTriangle, Clock, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

type Priority = "baixa" | "media" | "alta";
type Status = "pendente" | "em_andamento" | "concluida" | "cancelada";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string;
  assigned_to: string | null;
  company_id: string;
}

const priorityColors: Record<Priority, string> = {
  baixa: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  media: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  alta: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

const statusLabels: Record<Status, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export default function Tasks() {
  const { user } = useAuth();
  const { companyIds } = useUserCompanies();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"todas" | Status>("todas");

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const companyId = companyIds[0];

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("personal_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (companyId) q = q.eq("company_id", companyId);
    const { data, error } = await q;
    if (error) toast.error("Erro ao carregar tarefas");
    setTasks((data as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, companyId]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("media");
    setDueDate("");
  };

  const create = async () => {
    if (!title.trim()) return toast.error("Informe o título");
    if (!companyId) return toast.error("Empresa não identificada");
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("personal_tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      company_id: companyId,
      created_by: user.id,
      assigned_to: user.id,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao criar tarefa", { description: error.message });
    toast.success("Tarefa criada");
    reset();
    setOpen(false);
    load();
  };

  const toggleStatus = async (task: Task) => {
    const newStatus: Status = task.status === "concluida" ? "pendente" : "concluida";
    const { error } = await supabase
      .from("personal_tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "concluida" ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    if (error) return toast.error("Erro ao atualizar");
    load();
  };

  const setStatus = async (task: Task, status: Status) => {
    const { error } = await supabase
      .from("personal_tasks")
      .update({
        status,
        completed_at: status === "concluida" ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    if (error) return toast.error("Erro ao atualizar");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    const { error } = await supabase.from("personal_tasks").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Tarefa excluída");
    load();
  };

  const filtered = tasks.filter((t) => filter === "todas" || t.status === filter);

  const counts = {
    total: tasks.length,
    atrasadas: tasks.filter(
      (t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== "concluida" && t.status !== "cancelada"
    ).length,
    hoje: tasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date).toDateString() === new Date().toDateString() &&
        t.status !== "concluida"
    ).length,
    concluidas: tasks.filter((t) => t.status === "concluida").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <CheckSquare className="h-6 w-6 text-primary" />
            Minhas Tarefas
          </h1>
          <p className="text-sm text-muted-foreground">Organize tarefas internas do escritório.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Nova tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova tarefa</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Prioridade</label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Vencimento</label>
                  <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={create} disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={counts.total} icon={<CheckSquare className="h-4 w-4" />} />
        <StatCard
          label="Atrasadas"
          value={counts.atrasadas}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        />
        <StatCard label="Vencem hoje" value={counts.hoje} icon={<Clock className="h-4 w-4 text-amber-500" />} />
        <StatCard
          label="Concluídas"
          value={counts.concluidas}
          icon={<CheckSquare className="h-4 w-4 text-green-500" />}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["todas", "pendente", "em_andamento", "concluida", "cancelada"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "todas" ? "Todas" : statusLabels[f]}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarefas ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma tarefa.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => {
                const overdue =
                  t.due_date &&
                  isPast(new Date(t.due_date)) &&
                  t.status !== "concluida" &&
                  t.status !== "cancelada";
                return (
                  <div
                    key={t.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/5"
                  >
                    <Checkbox
                      checked={t.status === "concluida"}
                      onCheckedChange={() => toggleStatus(t)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-medium ${
                            t.status === "concluida"
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {t.title}
                        </span>
                        <Badge variant="outline" className={priorityColors[t.priority]}>
                          {t.priority}
                        </Badge>
                        {t.due_date && (
                          <span
                            className={`flex items-center gap-1 text-xs ${
                              overdue ? "text-red-500" : "text-muted-foreground"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {format(new Date(t.due_date), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                      )}
                    </div>
                    <Select value={t.status} onValueChange={(v) => setStatus(t, v as Status)}>
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className="rounded-md bg-muted p-2">{icon}</div>
      </CardContent>
    </Card>
  );
}
