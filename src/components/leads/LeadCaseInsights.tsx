import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, AlertTriangle, Scale, Target, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface LeadCaseInsightsProps {
  leadId: string;
  companyId: string;
}

interface CaseData {
  case_area: string | null;
  case_subtype: string | null;
  case_urgency: string | null;
  case_estimated_value: number | null;
  case_keywords: string[] | null;
  case_summary_short: string | null;
  case_next_action: string | null;
  case_confidence: number | null;
  case_classified_at: string | null;
}

const urgencyStyle: Record<string, string> = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-warning/15 text-warning border-warning/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

const areaLabel: Record<string, string> = {
  previdenciario: "Previdenciário",
  trabalhista: "Trabalhista",
  civil: "Cível",
  consumidor: "Consumidor",
  familia: "Família",
  criminal: "Criminal",
  tributario: "Tributário",
  empresarial: "Empresarial",
  imobiliario: "Imobiliário",
  outro: "Outro",
};

export function LeadCaseInsights({ leadId, companyId }: LeadCaseInsightsProps) {
  const [data, setData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: lead } = await supabase
      .from("leads")
      .select(
        "case_area, case_subtype, case_urgency, case_estimated_value, case_keywords, case_summary_short, case_next_action, case_confidence, case_classified_at"
      )
      .eq("id", leadId)
      .maybeSingle();
    if (lead) setData(lead as CaseData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [leadId]);

  const classify = async () => {
    setClassifying(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("classify-lead-case", {
        body: { lead_id: leadId, company_id: companyId },
      });
      if (error || res?.error) {
        toast.error(res?.error || "Erro ao analisar caso");
      } else {
        toast.success("Caso analisado pela IA");
        await load();
      }
    } catch {
      toast.error("Erro ao analisar caso");
    }
    setClassifying(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = data?.case_summary_short || data?.case_area;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Brain className="h-4 w-4 text-primary" />
          Entendimento do caso
        </h4>
        <Button variant="ghost" size="sm" onClick={classify} disabled={classifying}>
          {classifying ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : hasData ? (
            <RefreshCw className="h-3 w-3 mr-1 text-primary" />
          ) : (
            <Sparkles className="h-3 w-3 mr-1 text-primary" />
          )}
          {hasData ? "Reanalisar" : "Analisar com IA"}
        </Button>
      </div>

      {hasData ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          {data?.case_summary_short && (
            <p className="text-sm font-medium text-foreground leading-snug">
              {data.case_summary_short}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {data?.case_area && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                <Scale className="h-3 w-3 mr-1" />
                {areaLabel[data.case_area] || data.case_area}
              </Badge>
            )}
            {data?.case_subtype && (
              <Badge variant="outline" className="bg-background">
                {data.case_subtype}
              </Badge>
            )}
            {data?.case_urgency && (
              <Badge variant="outline" className={urgencyStyle[data.case_urgency] || ""}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgência {data.case_urgency}
              </Badge>
            )}
            {!!data?.case_estimated_value && data.case_estimated_value > 0 && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                ~ R$ {data.case_estimated_value.toLocaleString("pt-BR")}
              </Badge>
            )}
          </div>

          {data?.case_next_action && (
            <div className="flex items-start gap-2 rounded-md bg-primary/5 border border-primary/20 p-2">
              <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-foreground">
                <span className="font-semibold">Próxima ação: </span>
                {data.case_next_action}
              </p>
            </div>
          )}

          {data?.case_keywords && data.case_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.case_keywords.map((k) => (
                <span
                  key={k}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground"
                >
                  #{k}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            {data?.case_classified_at && (
              <span>Analisado em {new Date(data.case_classified_at).toLocaleString("pt-BR")}</span>
            )}
            {typeof data?.case_confidence === "number" && (
              <span>Confiança: {Math.round(data.case_confidence * 100)}%</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Clique em "Analisar com IA" para identificar área, tipo, urgência e próxima ação.
        </p>
      )}
    </div>
  );
}
