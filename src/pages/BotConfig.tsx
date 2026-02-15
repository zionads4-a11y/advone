import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { BotConfigCard } from "@/components/companies/BotConfigCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Loader2 } from "lucide-react";

export default function BotConfig() {
  const { user } = useAuth();
  const { companyIds, isClient, loading: companiesLoading } = useUserCompanies();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [hasConfig, setHasConfig] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      let query = supabase.from("companies").select("id, name").order("name");
      if (isClient && companyIds.length > 0) {
        query = query.in("id", companyIds);
      }
      const { data } = await query;
      if (data) {
        setCompanies(data);
        if (data.length === 1) setSelectedCompany(data[0].id);

        // Check which have whatsapp config
        const { data: configs } = await supabase
          .from("whatsapp_configs")
          .select("company_id")
          .in("company_id", data.map((c) => c.id));

        const configMap: Record<string, boolean> = {};
        (configs || []).forEach((c: any) => { configMap[c.company_id] = true; });
        setHasConfig(configMap);
      }
      setLoading(false);
    };
    if (!companiesLoading) fetch();
  }, [user, isClient, companyIds, companiesLoading]);

  if (loading || companiesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Bot de Atendimento
          </h1>
          <p className="text-sm text-muted-foreground">Configure o perfil de clientes e o robô de qualificação</p>
        </div>
        {companies.length > 1 && (
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedCompany ? (
        <BotConfigCard companyId={selectedCompany} hasWhatsappConfig={!!hasConfig[selectedCompany]} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Bot className="mb-3 h-10 w-10" />
          <p className="text-sm">Selecione uma empresa para configurar o bot</p>
        </div>
      )}
    </div>
  );
}
