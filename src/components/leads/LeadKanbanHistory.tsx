import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface KanbanHistoryEntry {
  id: string;
  from_column_name: string | null;
  to_column_name: string | null;
  moved_by: string | null;
  created_at: string;
  user_name?: string | null;
}

interface LeadKanbanHistoryProps {
  leadId: string;
}

export function LeadKanbanHistory({ leadId }: LeadKanbanHistoryProps) {
  const [history, setHistory] = useState<KanbanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [leadId]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lead_kanban_history")
      .select("id, from_column_name, to_column_name, moved_by, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (!data) {
      setHistory([]);
      setLoading(false);
      return;
    }

    // Buscar nomes dos usuários
    const userIds = [...new Set(data.map((h) => h.moved_by).filter(Boolean) as string[])];
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      userMap = (profs || []).reduce<Record<string, string>>((acc, p: any) => {
        acc[p.user_id] = p.full_name || "Usuário";
        return acc;
      }, {});
    }

    setHistory(
      data.map((h) => ({
        ...h,
        user_name: h.moved_by ? userMap[h.moved_by] || "Usuário" : "Sistema",
      }))
    );
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Histórico do Funil</h3>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : history.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma movimentação registrada.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => (
            <li
              key={h.id}
              className="rounded-md border border-border bg-muted/30 p-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {h.from_column_name ? (
                  <Badge variant="outline" className="text-[10px]">
                    {h.from_column_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="secondary" className="text-[10px]">
                  {h.to_column_name || "—"}
                </Badge>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{h.user_name}</span>
                <span>
                  {new Date(h.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
