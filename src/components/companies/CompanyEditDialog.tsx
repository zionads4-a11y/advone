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
import { Switch } from "@/components/ui/switch";
import { BILLING_MODELS, getBillingModel, inferBillingModel, type BillingModel } from "@/lib/billingModels";

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
  billing_model?: BillingModel | null;
  custom_base_value?: number | null;
  office_legal_name?: string | null;
  office_cnpj?: string | null;
  office_address?: string | null;
  bot_name?: string | null;
  bot_role_description?: string | null;
  google_client_id?: string | null;
  google_client_secret?: string | null;
  shared_whatsapp_number?: boolean | null;
  client_support_responsible_phone?: string | null;
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
      billing_model: BillingModel;
      custom_base_value: number | null;
      office_legal_name: string | null;
      office_cnpj: string | null;
      office_address: string | null;
      bot_name: string;
      bot_role_description: string;
      google_client_id: string | null;
      google_client_secret: string | null;
      shared_whatsapp_number: boolean;
      client_support_responsible_phone: string | null;
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
  const [billingModel, setBillingModel] = useState<BillingModel>("plan_completo");
  const [botName, setBotName] = useState("");
  const [botRoleDescription, setBotRoleDescription] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [customBaseValue, setCustomBaseValue] = useState<string>("");
  const [officeLegalName, setOfficeLegalName] = useState("");
  const [officeCnpj, setOfficeCnpj] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [sharedWhats, setSharedWhats] = useState(false);
  const [supportPhone, setSupportPhone] = useState("");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setWhatsapp(company.whatsapp || "");
      setBusinessHours(parseBusinessHours(company.business_hours));
      setBillingModel(
        (company.billing_model as BillingModel) ||
          inferBillingModel(company.partnership_type, company.service_mode),
      );
      setBotName(company.bot_name || "");
      setBotRoleDescription(company.bot_role_description || "");
      setGoogleClientId(company.google_client_id || "");
      setGoogleClientSecret(company.google_client_secret || "");
      setCustomBaseValue(company.custom_base_value?.toString() || "");
      setOfficeLegalName(company.office_legal_name || "");
      setOfficeCnpj(company.office_cnpj || "");
      setOfficeAddress(company.office_address || "");
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
            const model = getBillingModel(billingModel);
            onUpdate(company.id, {
              name,
              whatsapp: whatsapp || null,
              business_hours: businessHours,
              partnership_type: model.partnership_type,
              service_mode: model.service_mode,
              billing_model: model.key,
              custom_base_value: customBaseValue ? parseFloat(customBaseValue) : null,
              office_legal_name: officeLegalName || null,
              office_cnpj: officeCnpj || null,
              office_address: officeAddress || null,
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
            <Label>Nome Completo / Razão Social</Label>
            <Input
              value={officeLegalName}
              onChange={(e) => setOfficeLegalName(e.target.value)}
              placeholder="Nome para o boleto"
            />
          </div>
          <div className="space-y-2">
            <Label>CPF / CNPJ</Label>
            <Input
              value={officeCnpj}
              onChange={(e) => setOfficeCnpj(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-2">
            <Label>Endereço Completo</Label>
            <Input
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              placeholder="Rua, número, bairro..."
            />
          </div>
          <div className="space-y-2">
            <Label>Modelo de Cobrança *</Label>
            <Select
              value={billingModel}
              onValueChange={(v) => setBillingModel(v as BillingModel)}
            >
              <SelectTrigger>
                <SelectValue />
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
              {getBillingModel(billingModel).description}
            </p>
          </div>

          {billingModel === "plan_zionads" && (
            <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5 animate-in fade-in">
              <Label>Valor Base Customizado (R$)</Label>
              <Input 
                value={customBaseValue} 
                onChange={(e) => setCustomBaseValue(e.target.value)} 
                type="number" 
                step="0.01" 
                placeholder="0,00"
              />
              <p className="text-[10px] text-muted-foreground">
                Valor manual para ser incluído na cobrança (ex: tráfego pago).
              </p>
            </div>
          )}
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
