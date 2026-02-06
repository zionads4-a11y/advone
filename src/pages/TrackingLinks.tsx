import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Link2, Copy, ExternalLink, MousePointerClick, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { CreateTrackingLinkForm } from "@/components/tracking/CreateTrackingLinkForm";
import { TrackingLinkUtmTemplates } from "@/components/tracking/TrackingLinkUtmTemplates";

interface Company {
  id: string;
  name: string;
  whatsapp: string | null;
}

interface TrackingLink {
  id: string;
  company_id: string;
  slug: string;
  whatsapp_number: string;
  default_message: string | null;
  is_active: boolean;
  created_at: string;
  campaign_id: string | null;
}

interface Campaign {
  id: string;
  name: string;
  source: string;
}

interface ClickStats {
  tracking_link_id: string;
  total_clicks: number;
  matched_leads: number;
}

export default function TrackingLinks() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [clickStats, setClickStats] = useState<Record<string, ClickStats>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchLinks();
      fetchCampaigns();
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name, whatsapp").order("name");
    if (data && data.length > 0) {
      setCompanies(data);
      setSelectedCompanyId(data[0].id);
    }
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, source")
      .eq("company_id", selectedCompanyId)
      .order("name");
    if (data) setCampaigns(data);
  };

  const fetchLinks = async () => {
    const { data } = await supabase
      .from("tracking_links")
      .select("*")
      .eq("company_id", selectedCompanyId)
      .order("created_at", { ascending: false });

    if (data) {
      setLinks(data as TrackingLink[]);
      fetchClickStats(data.map((l) => l.id));
    }
  };

  const fetchClickStats = async (linkIds: string[]) => {
    if (linkIds.length === 0) return;

    const { data } = await supabase
      .from("tracking_clicks")
      .select("tracking_link_id, lead_id, matched_at")
      .in("tracking_link_id", linkIds);

    if (data) {
      const stats: Record<string, ClickStats> = {};
      data.forEach((click) => {
        const id = click.tracking_link_id;
        if (!stats[id]) stats[id] = { tracking_link_id: id, total_clicks: 0, matched_leads: 0 };
        stats[id].total_clicks++;
        if (click.lead_id && click.matched_at) stats[id].matched_leads++;
      });
      setClickStats(stats);
    }
  };

  const getTrackingUrl = (slug: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "oonteavjxzkovrzktnie";
    return `https://${projectId}.supabase.co/functions/v1/track-click?s=${slug}`;
  };

  const getTrackingUrlWithUtm = (slug: string, source?: string, campaign?: string) => {
    let url = getTrackingUrl(slug);
    if (source) url += `&utm_source=${encodeURIComponent(source)}`;
    if (campaign) url += `&utm_campaign=${encodeURIComponent(campaign)}`;
    return url;
  };

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(getTrackingUrl(slug));
    toast.success("URL copiada!");
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  // Show create form as full-page view
  if (showCreateForm && selectedCompany) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display text-xl text-foreground flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Criar Link Rastreável
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure um link para identificar a origem dos seus leads.
            </p>
          </CardHeader>
          <CardContent>
            <CreateTrackingLinkForm
              company={selectedCompany}
              campaigns={campaigns}
              onSuccess={() => {
                setShowCreateForm(false);
                fetchLinks();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Links Rastreáveis</h1>
          <p className="text-sm text-muted-foreground">
            Gere links para seus anúncios que rastreiam UTMs até a conversa no WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          {companies.length > 1 && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            className="gradient-primary text-primary-foreground"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Link
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{links.length}</p>
              <p className="text-xs text-muted-foreground">Links ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <MousePointerClick className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Object.values(clickStats).reduce((sum, s) => sum + s.total_clicks, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total de cliques</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Object.values(clickStats).reduce((sum, s) => sum + s.matched_leads, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Leads rastreados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-base text-foreground">Seus Links</CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Link2 className="mb-3 h-10 w-10" />
              <p>Nenhum link rastreável criado</p>
              <p className="text-xs">Crie seu primeiro link para usar nos anúncios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead className="text-center">Cliques</TableHead>
                    <TableHead className="text-center">Leads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const stats = clickStats[link.id];
                    return (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium text-sm text-primary">{link.slug}</span>
                            <TrackingLinkUtmTemplates slug={link.slug} />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{link.whatsapp_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {link.default_message || "Olá!"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">
                            <MousePointerClick className="mr-1 h-3 w-3" />
                            {stats?.total_clicks || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-success/30 text-success text-xs">
                            <Users className="mr-1 h-3 w-3" />
                            {stats?.matched_leads || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={link.is_active ? "default" : "secondary"}
                            className={`text-[10px] ${link.is_active ? "bg-success text-success-foreground" : ""}`}
                          >
                            {link.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyUrl(link.slug)}
                              title="Copiar URL"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(getTrackingUrl(link.slug), "_blank")}
                              title="Abrir link"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to use */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-base text-foreground">Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</div>
              <p className="text-sm font-medium text-foreground">Crie o link</p>
              <p className="text-xs text-muted-foreground">Gere um link rastreável para cada campanha ou anúncio</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">2</div>
              <p className="text-sm font-medium text-foreground">Use nos anúncios</p>
              <p className="text-xs text-muted-foreground">
                Cole a URL no seu anúncio adicionando UTMs: <code className="text-[10px] bg-background px-1 rounded">&utm_source=meta&utm_campaign=nome</code>
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">3</div>
              <p className="text-sm font-medium text-foreground">Rastreie automaticamente</p>
              <p className="text-xs text-muted-foreground">Quando o lead enviar a mensagem, o sistema associa os UTMs ao lead automaticamente</p>
            </div>
          </div>

          {links.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 mt-4">
              <p className="text-xs font-medium text-foreground mb-2">Exemplo de URL com UTMs:</p>
              <code className="text-[10px] text-muted-foreground break-all block bg-background rounded p-2">
                {getTrackingUrlWithUtm(links[0].slug, "meta", "campanha-exemplo")}
              </code>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
