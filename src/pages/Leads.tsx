import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";

type LeadStatus = "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";
type CampaignSource = "google" | "meta";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: LeadStatus;
  value: number;
  source: CampaignSource | null;
  notes: string | null;
  company_id: string;
  campaign_id: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  company_id: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "Novo", className: "bg-warning/15 text-warning border-warning/30" },
  contacted: { label: "Contatado", className: "bg-info/15 text-info border-info/30" },
  qualified: { label: "Qualificado", className: "bg-primary/15 text-primary border-primary/30" },
  negotiating: { label: "Negociando", className: "bg-info/15 text-info border-info/30" },
  won: { label: "Vendido", className: "bg-success/15 text-success border-success/30" },
  lost: { label: "Perdido", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [leadsRes, companiesRes, campaignsRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name"),
      supabase.from("campaigns").select("id, name, company_id"),
    ]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (campaignsRes.data) setCampaigns(campaignsRes.data);
    setLoading(false);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (lead.phone?.includes(search) ?? false);
    const matchStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchSource = filterSource === "all" || lead.source === filterSource;
    return matchSearch && matchStatus && matchSource;
  });

  const handleAddLead = async (formData: FormData) => {
    const companyId = formData.get("company_id") as string;
    if (!companyId || !user) {
      toast.error("Selecione uma empresa");
      return;
    }

    const { error } = await supabase.from("leads").insert({
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      whatsapp: (formData.get("whatsapp") as string) || null,
      company_id: companyId,
      campaign_id: (formData.get("campaign_id") as string) || null,
      source: (formData.get("source") as CampaignSource) || null,
      value: Number(formData.get("value")) || 0,
      notes: (formData.get("notes") as string) || null,
    });

    if (error) {
      toast.error("Erro ao adicionar lead: " + error.message);
    } else {
      toast.success("Lead adicionado com sucesso!");
      setDialogOpen(false);
      fetchData();
    }
  };

  const getCompanyName = (companyId: string) => companies.find((c) => c.id === companyId)?.name || "—";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-card text-foreground dark">
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Lead</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddLead(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input name="name" required placeholder="Nome do lead" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input name="phone" placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input name="whatsapp" placeholder="(11) 99999-9999" />
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
                  <Label>Campanha</Label>
                  <Select name="campaign_id">
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select name="source">
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Ads</SelectItem>
                      <SelectItem value="meta">Meta Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input name="value" type="number" step="0.01" placeholder="0,00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input name="notes" placeholder="Notas sobre o lead..." />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground">
                Adicionar Lead
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Contato</TableHead>
                  <TableHead className="text-muted-foreground">Empresa</TableHead>
                  <TableHead className="text-muted-foreground">Origem</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      {loading ? "Carregando..." : "Nenhum lead encontrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="border-border hover:bg-secondary/50">
                      <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.email || lead.phone || lead.whatsapp || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{getCompanyName(lead.company_id)}</TableCell>
                      <TableCell>
                        {lead.source ? (
                          <Badge variant="outline" className={lead.source === "google" ? "border-info/30 text-info" : "border-info/30 text-info"}>
                            {lead.source === "google" ? "Google" : "Meta"}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig[lead.status].className}>
                          {statusConfig[lead.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {lead.value > 0 ? `R$ ${Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
