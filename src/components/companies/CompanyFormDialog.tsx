import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILLING_MODELS, type BillingModel } from "@/lib/billingModels";
import { Plus } from "lucide-react";
import { useState } from "react";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
}

export function CompanyFormDialog({ open, onOpenChange, onSubmit }: CompanyFormDialogProps) {
  const [selectedModel, setSelectedModel] = useState<BillingModel>("plan_ia_monthly");
  const isFree = selectedModel === "plan_free";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar Empresa</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Nome da Empresa *</Label>
            <Input name="name" required placeholder="Nome da empresa" />
          </div>
          <div className="space-y-2">
            <Label>Nome Completo / Razão Social *</Label>
            <Input name="office_legal_name" required placeholder="Nome para o boleto" />
          </div>
          <div className="space-y-2">
            <Label>CPF / CNPJ *</Label>
            <Input name="office_cnpj" required placeholder="000.000.000-00 ou 00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label>Endereço Completo *</Label>
            <Input name="office_address" required placeholder="Rua, número, bairro, cidade, UF" />
          </div>
          <div className="space-y-2">
            <Label>Telefone / WhatsApp</Label>
            <Input name="whatsapp" placeholder="5511999999999" />
          </div>
          <div className="space-y-2">
            <Label>Modelo de Cobrança *</Label>
            <Select 
              name="billing_model" 
              defaultValue={selectedModel}
              onValueChange={(v) => setSelectedModel(v as BillingModel)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo de cobrança" />
              </SelectTrigger>
              <SelectContent>
                {BILLING_MODELS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.emoji} {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel === "plan_zionads" && (
              <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label>Valor Base Customizado (R$)</Label>
                <Input 
                  name="custom_base_value" 
                  type="number" 
                  step="0.01" 
                  placeholder="0,00" 
                  className="bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  Este valor será somado à fatura mensal da empresa no Asaas.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Define como a empresa será cobrada e quais módulos ela enxerga no sistema.
            </p>
          </div>
          <Button type="submit" className="w-full gradient-primary text-primary-foreground">
            Adicionar Empresa
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
