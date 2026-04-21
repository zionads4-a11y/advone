import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Building2, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DecisionRule {
  id: string;
  company_id: string | null;
  niche: string;
  case_type: string | null;
  rule_name: string;
  priority: number;
  conditions: any[];
  output: {
    score: number;
    classification: string;
    action: string;
    priority: string;
    reason: string;
  };
  is_active: boolean;
}

interface DecisionRulesPanelProps {
  companyId: string;
}

const classificationColors: Record<string, string> = {
  quente: "bg-destructive/15 text-destructive border-destructive/30",
  morno: "bg-warning/15 text-warning border-warning/30",
  frio: "bg-info/15 text-info border-info/30",
  invalido: "bg-muted text-muted-foreground",
};

const actionLabels: Record<string, string> = {
  agendar: "Agendar",
  continuar_qualificacao: "Continuar qualificação",
  pedir_documentos: "Pedir documentos",
  transferir_humano: "Transferir humano",
  encerrar: "Encerrar",
};

export function DecisionRulesPanel({ companyId }: DecisionRulesPanelProps) {
  const [rules, setRules] = useState<DecisionRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("decision_rules")
        .select("*")
        .eq("is_active", true)
        .or(`company_id.is.null,company_id.eq.${companyId}`)
        .order("priority", { ascending: true });

      setRules((data as any) || []);
      setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" />
          Motor de Decisão (Decision Engine)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Regras que classificam o lead automaticamente após a qualificação. Defaults globais aplicam-se a todas as empresas; overrides personalizam por escritório.
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px] pr-2">
          <div className="space-y-2">
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma regra ativa.
              </p>
            )}
            {rules.map((rule) => {
              const isGlobal = !rule.company_id;
              const cls = rule.output?.classification || "morno";
              return (
                <div
                  key={rule.id}
                  className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {rule.rule_name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] gap-1 ${isGlobal ? "border-primary/30" : "border-accent/30"}`}
                        >
                          {isGlobal ? <Globe className="h-2.5 w-2.5" /> : <Building2 className="h-2.5 w-2.5" />}
                          {isGlobal ? "Global" : "Empresa"}
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">
                          P{rule.priority}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {rule.niche}
                        {rule.case_type ? ` › ${rule.case_type}` : " › qualquer caso"}
                      </p>
                    </div>
                    <Badge variant="outline" className={`${classificationColors[cls]} text-[10px]`}>
                      {cls}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>
                      <strong className="text-foreground">Score:</strong> {rule.output?.score}
                    </span>
                    <span>
                      <strong className="text-foreground">Ação:</strong>{" "}
                      {actionLabels[rule.output?.action] || rule.output?.action}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    {rule.output?.reason}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <p className="text-[10px] text-muted-foreground mt-3">
          💡 Personalização por empresa estará disponível em breve via API.
        </p>
      </CardContent>
    </Card>
  );
}
