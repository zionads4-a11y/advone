import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Minus, Plus, Package } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PACKAGE_PRICE = 97;
const PROCESSES_PER_PACKAGE = 20;

interface MonitoringPackagePurchaseProps {
  companyId: string;
  onPurchaseComplete?: () => void;
}

export default function MonitoringPackagePurchase({ companyId, onPurchaseComplete }: MonitoringPackagePurchaseProps) {
  const [quantity, setQuantity] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalValue = PACKAGE_PRICE * quantity;
  const totalProcesses = PROCESSES_PER_PACKAGE * quantity;

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-monitoring", {
        body: { company_id: companyId, quantity },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data.message || "Cobrança criada com sucesso!");
      setConfirmOpen(false);
      onPurchaseComplete?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar compra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Pacote de Monitoramento</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Adicione monitoramento de processos ao seu escritório
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {PROCESSES_PER_PACKAGE} processos monitorados
              </p>
              <p className="text-xs text-muted-foreground">por pacote / mês</p>
            </div>
            <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
              R$ {PACKAGE_PRICE},00
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Quantidade de pacotes:</p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-bold w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processos:</span>
              <span className="font-medium">{totalProcesses}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor mensal:</span>
              <span className="font-bold text-primary">R$ {totalValue.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <p>A primeira cobrança será gerada imediatamente. O monitoramento será liberado após a confirmação do pagamento.</p>
          </div>

          <Button
            className="w-full"
            onClick={() => setConfirmOpen(true)}
          >
            Contratar Pacote
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar contratação</AlertDialogTitle>
            <AlertDialogDescription>
              Você está contratando <strong>{quantity} pacote{quantity > 1 ? "s" : ""}</strong> de monitoramento
              com <strong>{totalProcesses} processos</strong> por{" "}
              <strong>R$ {totalValue.toFixed(2).replace(".", ",")}/mês</strong>.
              <br /><br />
              Uma cobrança de <strong>R$ {totalValue.toFixed(2).replace(".", ",")}</strong> será gerada agora
              e o monitoramento será ativado após o pagamento. As cobranças seguintes serão mensais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurchase} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar e Pagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
