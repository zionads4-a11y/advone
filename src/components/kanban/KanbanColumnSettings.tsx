import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Settings2 } from "lucide-react";
import { toast } from "sonner";

export interface KanbanColumn {
  id: string;
  company_id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  is_meeting_held?: boolean;
}

interface KanbanColumnSettingsProps {
  companyId: string;
  companyName: string;
  columns: KanbanColumn[];
  onUpdate: () => void;
}

const PRESET_COLORS = [
  "#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4",
  "#22c55e", "#ef4444", "#ec4899", "#f97316",
  "#14b8a6", "#6366f1", "#84cc16", "#a855f7",
];

export function KanbanColumnSettings({ companyId, companyName, columns, onUpdate }: KanbanColumnSettingsProps) {
  const [open, setOpen] = useState(false);
  const [editColumns, setEditColumns] = useState<KanbanColumn[]>([]);
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditColumns([...columns].sort((a, b) => a.position - b.position));
    }
    setOpen(isOpen);
  };

  const addColumn = () => {
    setEditColumns((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        company_id: companyId,
        name: "",
        color: PRESET_COLORS[prev.length % PRESET_COLORS.length],
        position: prev.length,
        is_won: false,
        is_lost: false,
      },
    ]);
  };

  const removeColumn = (index: number) => {
    setEditColumns((prev) => prev.filter((_, i) => i !== index).map((col, i) => ({ ...col, position: i })));
  };

  const updateColumn = (index: number, field: keyof KanbanColumn, value: string | number | boolean) => {
    setEditColumns((prev) =>
      prev.map((col, i) => {
        if (i !== index) return col;
        const updated = { ...col, [field]: value };
        // Only one can be "won" or "lost"
        if (field === "is_won" && value === true) updated.is_lost = false;
        if (field === "is_lost" && value === true) updated.is_won = false;
        return updated;
      })
    );
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= editColumns.length) return;
    const updated = [...editColumns];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setEditColumns(updated.map((col, i) => ({ ...col, position: i })));
  };

  const handleSave = async () => {
    const invalid = editColumns.some((col) => !col.name.trim());
    if (invalid) {
      toast.error("Todas as colunas precisam ter um nome");
      return;
    }

    setSaving(true);

    // Delete removed columns
    const existingIds = columns.map((c) => c.id);
    const keepIds = editColumns.filter((c) => !c.id.startsWith("new-")).map((c) => c.id);
    const toDelete = existingIds.filter((id) => !keepIds.includes(id));

    for (const id of toDelete) {
      await supabase.from("kanban_columns").delete().eq("id", id);
    }

    // Upsert columns
    for (const col of editColumns) {
      if (col.id.startsWith("new-")) {
        await supabase.from("kanban_columns").insert({
          company_id: companyId,
          name: col.name,
          color: col.color,
          position: col.position,
          is_won: col.is_won,
          is_lost: col.is_lost,
        });
      } else {
        await supabase
          .from("kanban_columns")
          .update({
            name: col.name,
            color: col.color,
            position: col.position,
            is_won: col.is_won,
            is_lost: col.is_lost,
          })
          .eq("id", col.id);
      }
    }

    toast.success("Colunas salvas com sucesso!");
    setSaving(false);
    setOpen(false);
    onUpdate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
          <Settings2 className="mr-2 h-4 w-4" />
          Personalizar Funil
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display">
            Funil — {companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {editColumns.map((col, index) => (
            <Card key={col.id} className="border-border bg-secondary/30">
              <CardContent className="flex items-start gap-3 p-3">
                <div className="flex flex-col items-center gap-1 pt-2">
                  <button
                    type="button"
                    onClick={() => moveColumn(index, "up")}
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                  >
                    ▲
                  </button>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <button
                    type="button"
                    onClick={() => moveColumn(index, "down")}
                    disabled={index === editColumns.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                  >
                    ▼
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={col.name}
                      onChange={(e) => updateColumn(index, "name", e.target.value)}
                      placeholder="Nome da etapa"
                      className="flex-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateColumn(index, "color", color)}
                        className="h-6 w-6 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: color,
                          borderColor: col.color === color ? "white" : "transparent",
                          transform: col.color === color ? "scale(1.2)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={col.is_won}
                        onCheckedChange={(v) => updateColumn(index, "is_won", v)}
                      />
                      Etapa de venda
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={col.is_lost}
                        onCheckedChange={(v) => updateColumn(index, "is_lost", v)}
                      />
                      Etapa de perda
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full border-dashed border-border" onClick={addColumn}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Etapa
          </Button>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button className="flex-1 gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Funil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
