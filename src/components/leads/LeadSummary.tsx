import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Sparkles, Loader2, Pencil, Save } from "lucide-react";
import { toast } from "sonner";

interface Summary {
  id: string;
  summary_text: string;
  generated_by_ai: boolean;
  created_at: string;
  updated_at: string;
}

interface LeadSummaryProps {
  leadId: string;
  companyId: string;
}

export function LeadSummary({ leadId, companyId }: LeadSummaryProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [leadId]);

  const fetchSummary = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lead_summaries")
      .select("*")
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setSummary(data as Summary);
    setLoading(false);
  };

  const handleGenerateAI = async () => {
    if (!user) return;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-lead-summary", {
        body: { lead_id: leadId, company_id: companyId },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Erro ao gerar resumo com IA");
      } else if (data?.summary) {
        // Save or update the summary
        if (summary) {
          await supabase
            .from("lead_summaries")
            .update({ summary_text: data.summary, generated_by_ai: true })
            .eq("id", summary.id);
        } else {
          await supabase.from("lead_summaries").insert({
            lead_id: leadId,
            company_id: companyId,
            summary_text: data.summary,
            generated_by_ai: true,
            created_by: user.id,
          });
        }
        fetchSummary();
        toast.success("Resumo gerado pela IA!");
      }
    } catch {
      toast.error("Erro ao gerar resumo");
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!editText.trim() || !user) return;
    setSaving(true);

    if (summary) {
      const { error } = await supabase
        .from("lead_summaries")
        .update({ summary_text: editText.trim(), generated_by_ai: false })
        .eq("id", summary.id);
      if (!error) {
        setSummary({ ...summary, summary_text: editText.trim(), generated_by_ai: false });
        setEditing(false);
        toast.success("Resumo atualizado!");
      }
    } else {
      const { error } = await supabase.from("lead_summaries").insert({
        lead_id: leadId,
        company_id: companyId,
        summary_text: editText.trim(),
        generated_by_ai: false,
        created_by: user.id,
      });
      if (!error) {
        setEditing(false);
        fetchSummary();
        toast.success("Resumo salvo!");
      }
    }
    setSaving(false);
  };

  const startEditing = () => {
    setEditText(summary?.summary_text || "");
    setEditing(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Resumo da Conversa
        </h4>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateAI}
            disabled={generating}
            title="Gerar resumo com IA"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1 text-primary" />
            )}
            IA
          </Button>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Escreva o resumo da conversa com este lead..."
            className="min-h-[100px] text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !editText.trim()} className="flex-1">
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : summary ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm text-foreground whitespace-pre-wrap">{summary.summary_text}</p>
          <div className="mt-2 flex items-center gap-2">
            {summary.generated_by_ai && (
              <span className="text-[10px] text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Gerado por IA
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              Atualizado em {new Date(summary.updated_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum resumo ainda. Gere com IA ou escreva manualmente.
        </p>
      )}
    </div>
  );
}
