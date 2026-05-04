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
import { BILLING_MODELS } from "@/lib/billingModels";
import { Plus } from "lucide-react";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
}

export function CompanyFormDialog({ open, onOpenChange, onSubmit }: CompanyFormDialogProps) {
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
            <Label>Telefone / WhatsApp</Label>
            <Input name="whatsapp" placeholder="5511999999999" />
          </div>
          <div className="space-y-2">
            <Label>Modelo de Cobrança *</Label>
            <Select name="billing_model" defaultValue="crm_full">
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
