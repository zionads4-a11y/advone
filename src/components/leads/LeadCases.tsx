import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadCasesProps {
  leadId: string;
  companyId: string;
}

interface LinkedCase {
  id: string;
  client_name: string;
  case_number: string | null;
  status: string;
  created_at: string;
}

export function LeadCases({ leadId, companyId }: LeadCasesProps) {
  const [cases, setCases] = useState<LinkedCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("cases")
        .select("id, client_name, case_number, status, created_at")
        .eq("lead_id", leadId)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      setCases((data || []) as LinkedCase[]);
      setLoading(false);
    };
    fetch();
  }, [leadId, companyId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Processos Vinculados
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Processos Vinculados
      </h4>
      {cases.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum processo vinculado</p>
      ) : (
        <div className="space-y-2">
          {cases.map((c) => (
            <div key={c.id} className="flex items-start gap-2 rounded-md border border-border p-2.5">
              <Briefcase className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{c.client_name}</span>
                  <Badge
                    variant={c.status === "ativo" ? "default" : "secondary"}
                    className="text-[9px] shrink-0"
                  >
                    {c.status === "ativo" ? "Ativo" : c.status === "arquivado" ? "Arquivado" : c.status}
                  </Badge>
                </div>
                {c.case_number && (
                  <p className="text-[11px] text-muted-foreground">Nº {c.case_number}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
