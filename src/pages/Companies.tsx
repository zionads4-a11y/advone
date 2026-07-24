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
import { getBillingModel, type BillingModel } from "@/lib/billingModels";

interface Company {
  id: string;
  name: string;
  website: string | null;
  whatsapp: string | null;
  business_hours: unknown;
  created_at: string;
  partnership_type: "mensalidade_zionads" | null;
  service_mode: "full" | "ai_only" | null;
  billing_model: BillingModel | null;
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
      supabase
        .from("whatsapp_configs")
        .select("id, company_id, zapi_instance_id, zapi_webhook_configured, phone_number, status"),
    ]);
    if (companiesRes.data) setCompanies(companiesRes.data as unknown as Company[]);
    if (configsRes.data) {
      const map: Record<string, WhatsAppConfig> = {};
      configsRes.data.forEach((c) => (map[c.company_id] = c as WhatsAppConfig));
      setWhatsappConfigs(map);
    }
  };

  const handleAdd = async (formData: FormData) => {
    if (!user) return;

    const billingKey = (formData.get("billing_model") as BillingModel) || "plan_mensal";
    const model = getBillingModel(billingKey);
    const sharedWhats = formData.get("shared_whatsapp_number") === "true";
    const supportPhone = (formData.get("client_support_responsible_phone") as string) || "";
    const overrideBaseValue = formData.get("custom_base_value");
    const baseValue =
      overrideBaseValue && String(overrideBaseValue).trim().length > 0
        ? parseFloat(overrideBaseValue as string)
        : model.monthly_value || null;

    const legalName = (formData.get("office_legal_name") as string) || null;
    const cnpj = (formData.get("office_cnpj") as string) || null;
    const address = (formData.get("office_address") as string) || null;
    const whatsapp = (formData.get("whatsapp") as string) || null;
    const customerEmail = (formData.get("customer_email") as string) || null;
    const dueDay = parseInt((formData.get("due_day") as string) || "10", 10);
    const billingType = (formData.get("billing_type") as string) || "UNDEFINED";

    // desconto
    const hasDiscount = formData.get("has_discount") === "true";
    const discountType = (formData.get("discount_type") as string) || "percent";
    const discountValue = parseFloat((formData.get("discount_value") as string) || "0");
    const discountFinalPrice = parseFloat((formData.get("discount_final_price") as string) || "0");
    const discountReason = (formData.get("discount_reason") as string) || "";
    const discountValidUntil = (formData.get("discount_valid_until") as string) || "";
    const approverEmail = (formData.get("approver_email") as string) || "";
    const approverPassword = (formData.get("approver_password") as string) || "";

    const finalBillingValue =
      hasDiscount && discountFinalPrice > 0 ? discountFinalPrice : baseValue;

    const { data: created, error } = await supabase
      .from("companies")
      .insert({
        name: formData.get("name") as string,
        whatsapp,
        office_legal_name: legalName,
        office_cnpj: cnpj,
        office_address: address,
        partnership_type: model.partnership_type,
        service_mode: model.service_mode,
        billing_model: model.key,
        custom_base_value: finalBillingValue,
        shared_whatsapp_number: sharedWhats,
        client_support_responsible_phone: sharedWhats && supportPhone ? supportPhone : null,
        message_quota_monthly: model.message_quota_default ?? null,
        created_by: user.id,
      } as any)
      .select("id")
      .single();

    if (error || !created) {
      toast.error("Erro: " + (error?.message ?? "falha ao criar empresa"));
      return;
    }

    // Cria assinatura recorrente no Asaas automaticamente
    if (finalBillingValue && finalBillingValue > 0 && legalName && cnpj) {
      try {
        const { data: subData, error: subErr } = await supabase.functions.invoke(
          "create-company-subscription",
          {
            body: {
              company_id: created.id,
              user_id: user.id,
              plan: model.key,
              value: finalBillingValue,
              due_day: dueDay,
              billing_type: billingType,
              customer_name: legalName,
              customer_email: customerEmail,
              customer_phone: whatsapp,
              customer_cpf_cnpj: cnpj,
              ...(hasDiscount && {
                discount_type: discountType,
                discount_value: discountValue,
                discount_reason: discountReason,
                discount_valid_until: discountValidUntil || null,
                approver_email: approverEmail,
                approver_password: approverPassword,
              }),
            },
          },
        );
        if (subErr || (subData as { error?: string })?.error) {
          const msg = subErr?.message || (subData as { error?: string })?.error || "";
          toast.error("Empresa criada, mas falhou ao gerar assinatura: " + msg);
        } else {
          toast.success(
            hasDiscount
              ? "Empresa + assinatura criadas com desconto aprovado e registrado!"
              : "Empresa criada e assinatura recorrente gerada no Asaas!",
          );
        }
      } catch (e) {
        toast.error(
          "Empresa criada, mas falhou ao gerar assinatura: " + (e as Error).message,
        );
      }
    } else {
      toast.success("Empresa criada com sucesso!");
    }

    setDialogOpen(false);
    fetchData();
  };

  const handleUpdate = async (id: string, data: { name: string; whatsapp: string | null; business_hours?: Record<string, unknown[]>; partnership_type?: "mensalidade_zionads"; service_mode?: "full" | "ai_only"; billing_model?: BillingModel; custom_base_value?: number | null; ai_disabled?: boolean; message_quota_monthly?: number | null }) => {
    // Ao atualizar a empresa, também sincronizamos com whatsapp_configs para a trava global no webhook
    const { error } = await supabase.from("companies").update(data as any).eq("id", id);
    
    if (data.ai_disabled !== undefined) {
      await supabase.from("whatsapp_configs").update({ ai_disabled: data.ai_disabled }).eq("company_id", id);
    }


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
