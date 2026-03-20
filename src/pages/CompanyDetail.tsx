import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Link2, Users, Phone, MessageSquare, Kanban } from "lucide-react";
import { toast } from "sonner";

import { CompanyTrackingLinks } from "@/components/companies/CompanyTrackingLinks";
import { CompanyLeads } from "@/components/companies/CompanyLeads";
import { WhatsAppConfigDialog } from "@/components/companies/WhatsAppConfigDialog";
import { CompanyKanban } from "@/components/companies/CompanyKanban";
import { BotConfigCard } from "@/components/companies/BotConfigCard";

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

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    setLoading(true);
    const [companyRes, configRes] = await Promise.all([
      supabase.from("companies").select("*").eq("id", id!).maybeSingle(),
      supabase.from("whatsapp_configs").select("*").eq("company_id", id!).maybeSingle(),
    ]);

    if (companyRes.data) setCompany(companyRes.data);
    if (configRes.data) setWhatsappConfig(configRes.data as WhatsAppConfig);
    setLoading(false);
  };

  const handleSaveWhatsApp = async (formData: FormData) => {
    const instanceId = formData.get("zapi_instance_id") as string;
    const token = formData.get("zapi_token") as string;

    if (!instanceId || !token) {
      toast.error("Preencha o nome da instância e o token");
      return;
    }

    if (whatsappConfig) {
      await supabase
        .from("whatsapp_configs")
        .update({ zapi_instance_id: instanceId, zapi_token: token })
        .eq("id", whatsappConfig.id);
    } else {
      await supabase.from("whatsapp_configs").insert({
        company_id: id!,
        zapi_instance_id: instanceId,
        zapi_token: token,
      });
    }

    toast.success("Configuração WhatsApp salva!");
    setConfigDialogOpen(false);
    fetchCompany();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Building2 className="mb-3 h-10 w-10" />
        <p>Empresa não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/companies")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{company.name}</h1>
              <div className="flex items-center gap-3 mt-0.5">
                {company.whatsapp && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {company.whatsapp}
                  </span>
                )}
                {whatsappConfig ? (
                  <Badge variant="outline" className="border-success/30 text-success text-[10px]">
                    WhatsApp Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-warning/30 text-warning text-[10px]">
                    Sem WhatsApp
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfigDialogOpen(true)}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {whatsappConfig ? "Editar WhatsApp" : "Configurar WhatsApp"}
        </Button>
      </div>

      {/* WhatsApp Config Dialog */}
      <WhatsAppConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        companyId={company.id}
        config={whatsappConfig}
        onSubmit={handleSaveWhatsApp}
      />

      {/* Bot Config */}
      <BotConfigCard companyId={company.id} hasWhatsappConfig={!!whatsappConfig} />

      {/* Tabs */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="kanban" className="gap-2">
            <Kanban className="h-4 w-4" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2">
            <Link2 className="h-4 w-4" /> Links
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" /> Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <CompanyKanban companyId={company.id} companyName={company.name} />
        </TabsContent>

        <TabsContent value="tracking">
          <CompanyTrackingLinks companyId={company.id} companyWhatsapp={company.whatsapp} />
        </TabsContent>

        <TabsContent value="leads">
          <CompanyLeads companyId={company.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
