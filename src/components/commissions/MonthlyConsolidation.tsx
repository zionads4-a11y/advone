import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

export function MonthlyConsolidation() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleConsolidate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("invoice-monthly-meetings", {
        body: { invoice_month: month },
      });
      if (error) throw error;
      setResult(data);
      toast.success("Consolidação executada com sucesso");
    } catch (e: any) {
      toast.error("Erro ao consolidar: " + (e?.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Consolidar faturas no Asaas
        </CardTitle>
        <CardDescription>
          Gera uma cobrança única no Asaas por empresa, somando todas as reuniões realizadas no mês selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="invoice-month" className="text-sm">Mês de fatura (YYYY-MM)</Label>
            <Input
              id="invoice-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-[200px]"
            />
          </div>
          <Button onClick={handleConsolidate} disabled={loading || !month}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Consolidar mês
          </Button>
        </div>

        {result && (
          <pre className="text-xs bg-muted/40 p-3 rounded-lg overflow-auto max-h-80">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
