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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { BusinessHoursConfig, type BusinessHours, parseBusinessHours, getDefaultBusinessHours } from "./BusinessHoursConfig";
import { CompanyOfficesEditor } from "./CompanyOfficesEditor";
import { Separator } from "@/components/ui/separator";

export type PartnershipType = "exito" | "mensalidade_zionads";
export type ServiceMode = "full" | "ai_only";

interface Company {
  id: string;
  name: string;
  website: string | null;
  whatsapp: string | null;
  business_hours?: unknown;
  partnership_type?: PartnershipType | null;
  service_mode?: ServiceMode | null;
  bot_name?: string | null;
  bot_role_description?: string | null;
  google_client_id?: string | null;
  google_client_secret?: string | null;
}

interface CompanyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onUpdate: (
    id: string,
    data: {
      name: string;
      whatsapp: string | null;
      business_hours: BusinessHours;
      partnership_type: PartnershipType;
      service_mode: ServiceMode;
      bot_name: string;
      bot_role_description: string;
      google_client_id: string | null;
      google_client_secret: string | null;
    }
  ) => void;
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
  const [businessHours, setBusinessHours] = useState<BusinessHours>(getDefaultBusinessHours());
  const [partnershipType, setPartnershipType] = useState<PartnershipType>("mensalidade_zionads");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("full");
  const [botName, setBotName] = useState("");
  const [botRoleDescription, setBotRoleDescription] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setWhatsapp(company.whatsapp || "");
      setBusinessHours(parseBusinessHours(company.business_hours));
      setPartnershipType((company.partnership_type as PartnershipType) || "mensalidade_zionads");
      setServiceMode((company.service_mode as ServiceMode) || "full");
      setBotName(company.bot_name || "");
      setBotRoleDescription(company.bot_role_description || "");
      setGoogleClientId(company.google_client_id || "");
      setGoogleClientSecret(company.google_client_secret || "");
    }
  }, [company]);

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Empresa</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate(company.id, {
              name,
              whatsapp: whatsapp || null,
              business_hours: businessHours,
              partnership_type: partnershipType,
              service_mode: serviceMode,
              bot_name: botName,
              bot_role_description: botRoleDescription,
              google_client_id: googleClientId || null,
              google_client_secret: googleClientSecret || null,
            });
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
          <div className="space-y-2">
            <Label>Tipo de Parceria *</Label>
            <Select
              value={partnershipType}
              onValueChange={(v) => setPartnershipType(v as PartnershipType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensalidade_zionads">
                  💼 Mensalidade ZionAds (cliente da agência)
                </SelectItem>
                <SelectItem value="exito">
                  🏆 Êxito (comissão por contrato fechado)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define como a parceria comercial é gerida com esta empresa.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Modo de Serviço *</Label>
            <Select
              value={serviceMode}
              onValueChange={(v) => setServiceMode(v as ServiceMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">
                  🏢 CRM Completo (Kanban, Financeiro, Casos, etc.)
                </SelectItem>
                <SelectItem value="ai_only">
                  🤖 Apenas IA (Secretária Virtual + Áreas de Atuação)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              "Apenas IA" oculta módulos do CRM e libera só Conversas, Leads, Agenda e a configuração da IA.
            </p>
          </div>
          <BusinessHoursConfig value={businessHours} onChange={setBusinessHours} />

          <Separator className="my-2" />
          <CompanyOfficesEditor companyId={company.id} />
          <Separator className="my-2" />

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
