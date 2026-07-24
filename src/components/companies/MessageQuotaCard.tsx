import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Infinity as InfinityIcon } from "lucide-react";

interface Props {
  companyId: string;
}

export function MessageQuotaCard({ companyId }: Props) {
  const [quota, setQuota] = useState<number | null>(null);
  const [used, setUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("message_quota_monthly, messages_used_current_period")
        .eq("id", companyId)
        .maybeSingle();
      if (mounted && data) {
        setQuota((data as any).message_quota_monthly ?? null);
        setUsed((data as any).messages_used_current_period ?? 0);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [companyId]);

  if (loading) return null;

  const isUnlimited = quota == null;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / (quota || 1)) * 100));
  const remaining = isUnlimited ? null : Math.max(0, (quota as number) - used);

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();

  const barColor = pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" />
          Saldo de mensagens da IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isUnlimited ? (
          <div className="flex items-center gap-2 text-sm">
            <InfinityIcon className="h-5 w-5 text-primary" />
            <span className="font-medium">Ilimitado</span>
            <span className="text-muted-foreground">— plano Enterprise</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {used.toLocaleString("pt-BR")}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}/ {quota!.toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {remaining!.toLocaleString("pt-BR")} restantes este mês
                </p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-semibold ${pct >= 100 ? "text-destructive" : pct >= 80 ? "text-amber-600" : "text-primary"}`}>
                  {pct}%
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Renova em {daysLeft} dia{daysLeft === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <Progress value={pct} className="h-2" indicatorClassName={barColor} />
            {pct >= 100 && (
              <p className="text-xs text-destructive font-medium">
                Cota atingida — a Laura está pausada até o dia 1. Faça upgrade para liberar agora.
              </p>
            )}
            {pct >= 80 && pct < 100 && (
              <p className="text-xs text-amber-600">
                Atenção: você já usou 80% da cota. Considere upgrade para não pausar o atendimento.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
