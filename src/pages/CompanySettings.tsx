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
}

export default function CompanySettings() {
  const { user } = useAuth();
  const { companyIds, loading: companiesLoading } = useUserCompanies();
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(getDefaultBusinessHours());
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
      supabase.from("companies").select("id, name, whatsapp, business_hours, google_client_id, google_client_secret").eq("id", id).maybeSingle(),
      supabase.from("company_monitoring_plans").select("is_active").eq("company_id", id).maybeSingle(),
    ]);
    if (companyResult.data) {
      setCompany(companyResult.data as Company);
      setName(companyResult.data.name);
      setWhatsapp(companyResult.data.whatsapp || "");
      setGoogleClientId(companyResult.data.google_client_id || "");
      setGoogleClientSecret(companyResult.data.google_client_secret || "");
      setBusinessHours(parseBusinessHours(companyResult.data.business_hours));
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
        google_client_secret: googleClientSecret || null
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
