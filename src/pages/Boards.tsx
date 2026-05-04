import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Layers, Plus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Board {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  company_id: string;
  created_at: string;
}

const COLORS = ["#0ea5a4", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#10b981", "#ec4899"];

export default function Boards() {
  const { user } = useAuth();
  const { companyIds } = useUserCompanies();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const companyId = companyIds[0];

  const load = async () => {
    if (!companyId) return setLoading(false);
    setLoading(true);
    const { data, error } = await supabase
      .from("kanban_boards")
      .select("*")
      .eq("company_id", companyId)
      .order("position");
    if (error) toast.error("Erro ao carregar quadros");
    setBoards((data as Board[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const create = async () => {
    if (!name.trim()) return toast.error("Informe o nome");
    if (!companyId || !user) return;
    setSaving(true);
    const { error } = await supabase.from("kanban_boards").insert({
      name: name.trim(),
      description: description.trim() || null,
      color,
      company_id: companyId,
      created_by: user.id,
      position: boards.length,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao criar quadro", { description: error.message });
    toast.success("Quadro criado");
    setName("");
    setDescription("");
    setColor(COLORS[0]);
    setOpen(false);
    load();
  };

  const remove = async (b: Board) => {
    if (b.is_default) return toast.error("Não é possível excluir o quadro padrão");
    if (!confirm(`Excluir o quadro "${b.name}"? As colunas vinculadas ficarão sem quadro.`)) return;
    const { error } = await supabase.from("kanban_boards").delete().eq("id", b.id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Quadro excluído");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Layers className="h-6 w-6 text-primary" />
            Quadros Kanban
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie pipelines separados por setor (Comercial, Jurídico, Pós-venda…).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Novo quadro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo quadro</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome do quadro" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div>
                <label className="text-xs text-muted-foreground">Cor</label>
                <div className="mt-1 flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        color === c ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Card
              key={b.id}
              className="group relative cursor-pointer transition hover:shadow-lg"
              onClick={() => navigate("/kanban")}
            >
              <div className="absolute left-0 top-0 h-1 w-full rounded-t-lg" style={{ background: b.color }} />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4" style={{ color: b.color }} />
                    {b.name}
                  </span>
                  {b.is_default && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3" /> Padrão
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                <div className="flex justify-end">
                  {!b.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(b);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {boards.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
              Nenhum quadro ainda. Crie o primeiro!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
