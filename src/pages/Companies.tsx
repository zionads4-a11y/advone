import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyMetrics } from "@/hooks/useCompanyMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { CompanyCard } from "@/components/companies/CompanyCard";
import { CompanyFormDialog } from "@/components/companies/CompanyFormDialog";
import { CompanyEditDialog } from "@/components/companies/CompanyEditDialog";
import { WhatsAppConfigDialog } from "@/components/companies/WhatsAppConfigDialog";

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
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const metrics = useCompanyMetrics(companies.map((c) => c.id));

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

    const { error } = await supabase.from("companies").insert({
      name: formData.get("name") as string,
      whatsapp: (formData.get("whatsapp") as string) || null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }

    toast.success("Empresa criada com sucesso!");
    setDialogOpen(false);
    fetchData();
  };

  const handleUpdate = async (id: string, data: { name: string; whatsapp: string | null }) => {
    const { error } = await supabase.from("companies").update(data).eq("id", id);

    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }

    toast.success("Empresa atualizada!");
    setEditDialogOpen(false);
    setEditingCompany(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }

    toast.success("Empresa excluída!");
    setEditDialogOpen(false);
    setEditingCompany(null);
    fetchData();
  };

  const handleSaveWhatsApp = async () => {
    // Refresh data after save (actual save is handled by the dialog via edge function)
    setWhatsappDialogOpen(false);
    fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} empresa{companies.length !== 1 ? "s" : ""} cadastrada{companies.length !== 1 ? "s" : ""}
          </p>
        </div>
        <CompanyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleAdd} />
      </div>

      {/* Edit Dialog */}
      <CompanyEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        company={editingCompany}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* WhatsApp Config Dialog */}
      <WhatsAppConfigDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        companyId={selectedCompanyId}
        config={whatsappConfigs[selectedCompanyId] || null}
        onSubmit={handleSaveWhatsApp}
      />

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
          companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              hasWhatsApp={!!whatsappConfigs[company.id]}
              metrics={metrics[company.id] || { leads: 0, campaigns: 0, trackingLinks: 0 }}
              onConfigureWhatsApp={() => {
                setSelectedCompanyId(company.id);
                setWhatsappDialogOpen(true);
              }}
              onEdit={() => {
                setEditingCompany(company);
                setEditDialogOpen(true);
              }}
              onDelete={() => handleDelete(company.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
