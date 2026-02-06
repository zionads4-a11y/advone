import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Megaphone, TrendingUp, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  source: "google" | "meta";
  budget: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  company_id: string;
  campaign_id_external: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [campaignsRes, companiesRes, leadsRes] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name"),
      supabase.from("leads").select("campaign_id"),
    ]);

    if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[]);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (leadsRes.data) {
      const counts: Record<string, number> = {};
      leadsRes.data.forEach((l) => {
        if (l.campaign_id) counts[l.campaign_id] = (counts[l.campaign_id] || 0) + 1;
      });
      setLeadCounts(counts);
    }
  };

  const handleAdd = async (formData: FormData) => {
    if (!user) return;
    const { error } = await supabase.from("campaigns").insert({
      name: formData.get("name") as string,
      source: formData.get("source") as "google" | "meta",
      company_id: formData.get("company_id") as string,
      budget: Number(formData.get("budget")) || 0,
      campaign_id_external: (formData.get("campaign_id_external") as string) || null,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Campanha criada com sucesso!");
      setDialogOpen(false);
      fetchData();
    }
  };

  const getCompanyName = (id: string) => companies.find((c) => c.id === id)?.name || "—";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground">{campaigns.length} campanhas ativas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-foreground">
            <DialogHeader>
              <DialogTitle className="font-display">Criar Campanha</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome da Campanha *</Label>
                  <Input name="name" required placeholder="Ex: Black Friday 2025" />
                </div>
                <div className="space-y-2">
                  <Label>Origem *</Label>
                  <Select name="source" required>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Ads</SelectItem>
                      <SelectItem value="meta">Meta Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select name="company_id" required>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orçamento (R$)</Label>
                  <Input name="budget" type="number" step="0.01" placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>ID Externo</Label>
                  <Input name="campaign_id_external" placeholder="ID da campanha na plataforma" />
                </div>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input name="start_date" type="date" />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground">Criar Campanha</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.length === 0 ? (
          <Card className="glass-card col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Megaphone className="mb-3 h-10 w-10" />
              <p>Nenhuma campanha cadastrada</p>
              <p className="text-xs">Crie sua primeira campanha para começar</p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="glass-card transition-all hover:border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-display text-base text-foreground">{campaign.name}</CardTitle>
                  <Badge variant="outline" className={campaign.source === "google" ? "border-info/30 text-info" : "border-info/30 text-info"}>
                    {campaign.source === "google" ? "Google" : "Meta"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{getCompanyName(campaign.company_id)}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" /> Orçamento
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    R$ {Number(campaign.budget).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> Leads
                  </div>
                  <span className="text-sm font-medium text-foreground">{leadCounts[campaign.id] || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> Status
                  </div>
                  <Badge variant="outline" className="border-success/30 text-success text-xs">{campaign.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
