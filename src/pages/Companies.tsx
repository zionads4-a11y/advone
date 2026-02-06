import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Globe, Phone, MessageSquare, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  website: string | null;
  whatsapp: string | null;
  created_at: string;
}

interface WhatsAppConfig {
  id: string;
  company_id: string;
  zapi_instance_id: string;
  zapi_token: string;
  zapi_webhook_configured: boolean;
  phone_number: string | null;
  status: string;
}

export default function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [whatsappConfigs, setWhatsappConfigs] = useState<Record<string, WhatsAppConfig>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [zapiDialogOpen, setZapiDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [companiesRes, configsRes] = await Promise.all([
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_configs").select("*"),
    ]);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (configsRes.data) {
      const map: Record<string, WhatsAppConfig> = {};
      configsRes.data.forEach((c) => (map[c.company_id] = c as WhatsAppConfig));
      setWhatsappConfigs(map);
    }
  };

  const handleAdd = async (formData: FormData) => {
    if (!user) return;

    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        name: formData.get("name") as string,
        website: (formData.get("website") as string) || null,
        whatsapp: (formData.get("whatsapp") as string) || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }

    // If Z-API credentials provided, save config
    const zapiInstance = formData.get("zapi_instance_id") as string;
    const zapiToken = formData.get("zapi_token") as string;

    if (zapiInstance && zapiToken && company) {
      await supabase.from("whatsapp_configs").insert({
        company_id: company.id,
        zapi_instance_id: zapiInstance,
        zapi_token: zapiToken,
      });
    }

    toast.success("Empresa criada com sucesso!");
    setDialogOpen(false);
    fetchData();
  };

  const handleSaveZapi = async (formData: FormData) => {
    const zapiInstance = formData.get("zapi_instance_id") as string;
    const zapiToken = formData.get("zapi_token") as string;

    if (!zapiInstance || !zapiToken) {
      toast.error("Preencha o ID da instância e o token");
      return;
    }

    const existing = whatsappConfigs[selectedCompanyId];

    if (existing) {
      await supabase
        .from("whatsapp_configs")
        .update({ zapi_instance_id: zapiInstance, zapi_token: zapiToken })
        .eq("id", existing.id);
    } else {
      await supabase.from("whatsapp_configs").insert({
        company_id: selectedCompanyId,
        zapi_instance_id: zapiInstance,
        zapi_token: zapiToken,
      });
    }

    toast.success("Configuração Z-API salva!");
    setZapiDialogOpen(false);
    fetchData();
  };

  const getWebhookUrl = (companyId: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "oonteavjxzkovrzktnie";
    return `https://${projectId}.supabase.co/functions/v1/zapi-webhook?company_id=${companyId}`;
  };

  const copyWebhookUrl = (companyId: string) => {
    navigator.clipboard.writeText(getWebhookUrl(companyId));
    toast.success("URL do webhook copiada!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">{companies.length} empresas cadastradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-card text-foreground dark">
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input name="name" required placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input name="website" placeholder="https://exemplo.com.br" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input name="whatsapp" placeholder="5511999999999" />
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Integração Z-API (opcional)</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure para rastrear leads que chegam pelo WhatsApp automaticamente.
                </p>
                <div className="space-y-2">
                  <Label className="text-xs">ID da Instância</Label>
                  <Input name="zapi_instance_id" placeholder="Ex: 3C1A2B3D4E5F..." className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Token</Label>
                  <Input name="zapi_token" type="password" placeholder="Token da Z-API" className="text-sm" />
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground">Adicionar Empresa</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Z-API config dialog */}
      <Dialog open={zapiDialogOpen} onOpenChange={setZapiDialogOpen}>
        <DialogContent className="bg-card text-foreground dark">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Configurar WhatsApp (Z-API)
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveZapi(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="space-y-2">
              <Label>ID da Instância *</Label>
              <Input
                name="zapi_instance_id"
                required
                placeholder="Ex: 3C1A2B3D4E5F..."
                defaultValue={whatsappConfigs[selectedCompanyId]?.zapi_instance_id || ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Token *</Label>
              <Input
                name="zapi_token"
                type="password"
                required
                placeholder="Token da Z-API"
                defaultValue={whatsappConfigs[selectedCompanyId]?.zapi_token || ""}
              />
            </div>

            {selectedCompanyId && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">URL do Webhook</p>
                <p className="text-xs text-muted-foreground">
                  Configure esta URL no painel da Z-API como webhook de recebimento:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-background p-2 text-[10px] text-foreground break-all">
                    {getWebhookUrl(selectedCompanyId)}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={() => copyWebhookUrl(selectedCompanyId)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full gradient-primary text-primary-foreground">Salvar Configuração</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.length === 0 ? (
          <Card className="glass-card col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="mb-3 h-10 w-10" />
              <p>Nenhuma empresa cadastrada</p>
              <p className="text-xs">Cadastre sua primeira empresa para começar</p>
            </CardContent>
          </Card>
        ) : (
          companies.map((company) => {
            const config = whatsappConfigs[company.id];
            const hasZapi = !!config;

            return (
              <Card key={company.id} className="glass-card transition-all hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="font-display text-base text-foreground">{company.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {company.website && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        {company.website}
                      </a>
                    </div>
                  )}
                  {company.whatsapp && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {company.whatsapp}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {hasZapi ? (
                      <Badge variant="outline" className="border-success/30 text-success text-[10px]">
                        <CheckCircle className="mr-1 h-3 w-3" /> Z-API Conectada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-warning/30 text-warning text-[10px]">
                        <AlertCircle className="mr-1 h-3 w-3" /> Sem WhatsApp
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setSelectedCompanyId(company.id);
                      setZapiDialogOpen(true);
                    }}
                  >
                    <MessageSquare className="mr-2 h-3 w-3" />
                    {hasZapi ? "Editar Z-API" : "Configurar WhatsApp"}
                  </Button>

                  <p className="text-xs text-muted-foreground/60">
                    Cadastrada em {new Date(company.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
