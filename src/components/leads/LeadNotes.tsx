import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Save, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

interface LeadNotesProps {
  leadId: string;
  companyId: string;
  onUpdate?: () => void;
}

export function LeadNotes({ leadId, companyId, onUpdate }: LeadNotesProps) {
  const [notes, setNotes] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [leadId]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("notes")
      .eq("id", leadId)
      .maybeSingle();

    const val = data?.notes || "";
    setNotes(val);
    setOriginalNotes(val);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({ notes: notes.trim() || null })
      .eq("id", leadId);

    if (error) {
      toast.error("Erro ao salvar anotações");
    } else {
      toast.success("Anotações salvas!");
      setOriginalNotes(notes.trim());
      setEditing(false);
      onUpdate?.();
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setNotes(originalNotes);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando anotações...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5" />
          Anotações
        </h4>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Editar
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione anotações sobre este lead..."
            className="min-h-[100px] text-sm resize-none"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {notes.length}/2000
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleCancel}
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSave}
                disabled={saving || notes === originalNotes}
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="text-sm text-foreground whitespace-pre-wrap cursor-pointer rounded-md border border-transparent hover:border-border p-2 -mx-2 min-h-[40px]"
          onClick={() => setEditing(true)}
        >
          {originalNotes || (
            <span className="text-muted-foreground italic text-xs">
              Clique para adicionar anotações...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
