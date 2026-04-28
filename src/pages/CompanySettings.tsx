import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { BusinessHoursConfig, type BusinessHours, parseBusinessHours, getDefaultBusinessHours } from "@/components/companies/BusinessHoursConfig";
import MonitoringPackagePurchase from "@/components/monitoring/MonitoringPackagePurchase";
import { ZapSignConfigCard } from "@/components/companies/ZapSignConfigCard";
import { CompanyOfficesEditor } from "@/components/companies/CompanyOfficesEditor";
import { CompanyNicheAlertsCard } from "@/components/companies/CompanyNicheAlertsCard";
import { CadenceConfigCard } from "@/components/companies/CadenceConfigCard";
import { MeetingRemindersConfigCard } from "@/components/companies/MeetingRemindersConfigCard";

interface Company {
  id: string;
  name: string;
  whatsapp: string | null;
  business_hours: unknown;
  google_client_id: string | null;
  google_client_secret: string | null;
  bot_name: string | null;
  bot_role_description: string | null;
  bot_prompt: string | null;
}

export default function CompanySettings() {
  const { user, userRole } = useAuth();
  const { companyIds, loading: companiesLoading } = useUserCompanies();
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(getDefaultBusinessHours());
  const [botName, setBotName] = useState("Laura");
  const [botRoleDescription, setBotRoleDescription] = useState("atendente virtual");
  const [botPrompt, setBotPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMonitoring, setHasMonitoring] = useState(true);

  useEffect(() => {
    if (companyIds.length > 0) {
      fetchCompany(companyIds[0]);
    } else if (!companiesLoading) {
      setLoading(false);
    }
  }, [companyIds, companiesLoading]);

  const fetchCompany = async (id: string) => {
    const [companyResult, planResult] = await Promise.all([
      supabase.from("companies").select("id, name, whatsapp, business_hours, google_client_id, google_client_secret, bot_name, bot_role_description, bot_prompt").eq("id", id).maybeSingle(),
      supabase.from("company_monitoring_plans").select("is_active").eq("company_id", id).maybeSingle(),
    ]);
    if (companyResult.data) {
      setCompany(companyResult.data as Company);
      setName(companyResult.data.name);
      setWhatsapp(companyResult.data.whatsapp || "");
      setGoogleClientId(companyResult.data.google_client_id || "");
      setGoogleClientSecret(companyResult.data.google_client_secret || "");
      setBusinessHours(parseBusinessHours(companyResult.data.business_hours));
      setBotName(companyResult.data.bot_name || "Laura");
      setBotRoleDescription(companyResult.data.bot_role_description || "atendente virtual");
      setBotPrompt(companyResult.data.bot_prompt || "");
    }
    setHasMonitoring(!!planResult.data?.is_active);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ 
        name, 
        whatsapp: whatsapp || null, 
        business_hours: businessHours as any,
        google_client_id: googleClientId || null,
        google_client_secret: googleClientSecret || null,
        bot_name: botName || 'Laura',
        bot_role_description: botRoleDescription || 'atendente virtual',
        bot_prompt: botPrompt || null
      })
      .eq("id", company.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configurações salvas!");
    }
    setSaving(false);
  };

  if (loading || companiesLoading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>;
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Building2 className="mb-3 h-10 w-10" />
        <p>Nenhuma empresa vinculada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Configurações da Empresa</h1>
        <p className="text-sm text-muted-foreground">{company.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone / WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5511999999999" />
            </div>
          </CardContent>
        </Card>

        {userRole === "admin" && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Personalização do Bot SDR (IA)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Assistente</Label>
                    <Input 
                      value={botName} 
                      onChange={(e) => setBotName(e.target.value)} 
                      placeholder="Ex: Laura, Julia, Maria..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Como ela se apresenta (Cargo/Função)</Label>
                    <Input 
                      value={botRoleDescription} 
                      onChange={(e) => setBotRoleDescription(e.target.value)} 
                      placeholder="Ex: atendente virtual, secretária, assistente jurídica..."
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Prompt / Instruções do Bot (SDR)</Label>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={botPrompt}
                    onChange={(e) => setBotPrompt(e.target.value)}
                    placeholder="Descreva detalhadamente como o bot deve se comportar, o tom de voz e as regras de negócio..."
                  />
                  <p className="text-xs text-muted-foreground italic">
                    Este campo define o comportamento e o conhecimento da IA.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {userRole === "admin" && (
        <>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Google OAuth (Agenda)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ID do Cliente (OAuth)</Label>
                <Input 
                  value={googleClientId} 
                  onChange={(e) => setGoogleClientId(e.target.value)} 
                  placeholder="123456-abcde.apps.googleusercontent.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Segredo do Cliente</Label>
                <Input 
                  type="password"
                  value={googleClientSecret} 
                  onChange={(e) => setGoogleClientSecret(e.target.value)} 
                  placeholder="••••••••••••••••"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <CompanyOfficesEditor companyId={company.id} />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Horário de Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessHoursConfig value={businessHours} onChange={setBusinessHours} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>

      {/* Cadência de Follow-Up */}
      <CadenceConfigCard companyId={company.id} />

      {/* Lembretes de Reunião */}
      <MeetingRemindersConfigCard companyId={company.id} />

      {/* Notificação de reunião por área de atuação */}
      <CompanyNicheAlertsCard companyId={company.id} />

      {/* ZapSign Config */}
      <ZapSignConfigCard companyId={company.id} />



      {!hasMonitoring && company && (
        <MonitoringPackagePurchase
          companyId={company.id}
          onPurchaseComplete={() => fetchCompany(company.id)}
        />
      )}
    </div>
  );
}
