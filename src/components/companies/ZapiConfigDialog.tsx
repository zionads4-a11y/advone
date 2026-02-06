import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Copy } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppConfig {
  id: string;
  company_id: string;
  zapi_instance_id: string;
  zapi_token: string;
  zapi_webhook_configured: boolean;
  phone_number: string | null;
  status: string;
}

interface ZapiConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  config: WhatsAppConfig | null;
  onSubmit: (formData: FormData) => void;
}

function getWebhookUrl(companyId: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "oonteavjxzkovrzktnie";
  return `https://${projectId}.supabase.co/functions/v1/zapi-webhook?company_id=${companyId}`;
}

export function ZapiConfigDialog({
  open,
  onOpenChange,
  companyId,
  config,
  onSubmit,
}: ZapiConfigDialogProps) {
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(getWebhookUrl(companyId));
    toast.success("URL do webhook copiada!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Configurar WhatsApp (Z-API)
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>ID da Instância *</Label>
            <Input
              name="zapi_instance_id"
              required
              placeholder="Ex: 3C1A2B3D4E5F..."
              defaultValue={config?.zapi_instance_id || ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Token *</Label>
            <Input
              name="zapi_token"
              type="password"
              required
              placeholder="Token da Z-API"
              defaultValue={config?.zapi_token || ""}
            />
          </div>

          {companyId && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">URL do Webhook</p>
              <p className="text-xs text-muted-foreground">
                Configure esta URL no painel da Z-API como webhook de recebimento:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background p-2 text-[10px] text-foreground break-all">
                  {getWebhookUrl(companyId)}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={copyWebhookUrl}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full gradient-primary text-primary-foreground">
            Salvar Configuração
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
