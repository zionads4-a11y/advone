import { AlertTriangle, CreditCard, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SubscriptionBlockScreenProps {
  status: string | null;
}

export default function SubscriptionBlockScreen({ status }: SubscriptionBlockScreenProps) {
  const isOverdue = status === "overdue";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-destructive/30">
        <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            {isOverdue ? (
              <AlertTriangle className="h-12 w-12 text-destructive" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {isOverdue ? "Pagamento pendente" : "Assinatura cancelada"}
            </h1>
            <p className="text-muted-foreground max-w-sm">
              {isOverdue
                ? "Sua assinatura possui um pagamento em atraso. Regularize para continuar utilizando o sistema."
                : "Sua assinatura foi cancelada. Entre em contato com o suporte para reativá-la e voltar a usar o sistema."}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>
              Em caso de dúvidas, entre em contato pelo WhatsApp ou e-mail de suporte.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
