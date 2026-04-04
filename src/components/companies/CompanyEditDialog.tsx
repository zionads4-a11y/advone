import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BusinessHoursConfig, BusinessHours, parseBusinessHours, getDefaultBusinessHours } from "./BusinessHoursConfig";

interface Company {
  id: string;
  name: string;
  website: string | null;
  whatsapp: string | null;
  business_hours?: unknown;
}

interface CompanyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onUpdate: (id: string, data: { name: string; whatsapp: string | null; business_hours: BusinessHours }) => void;
  onDelete: (id: string) => void;
}

export function CompanyEditDialog({
  open,
  onOpenChange,
  company,
  onUpdate,
  onDelete,
}: CompanyEditDialogProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setWhatsapp(company.whatsapp || "");
    }
  }, [company]);

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Empresa</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate(company.id, { name, whatsapp: whatsapp || null });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Nome da Empresa *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Telefone / WhatsApp</Label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="5511999999999"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 gradient-primary text-primary-foreground">
              Salvar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os dados relacionados a esta empresa serão
                    removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete(company.id)}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
