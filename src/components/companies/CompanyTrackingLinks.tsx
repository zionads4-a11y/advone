import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Link2, Copy, ExternalLink, MousePointerClick, Users, TrendingUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CreateTrackingLinkForm } from "@/components/tracking/CreateTrackingLinkForm";
import { TrackingLinkUtmTemplates } from "@/components/tracking/TrackingLinkUtmTemplates";

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

interface CompanyTrackingLinksProps {
  companyId: string;
  companyWhatsapp: string | null;
}

export function CompanyTrackingLinks({ companyId, companyWhatsapp }: CompanyTrackingLinksProps) {
  const { user } = useAuth();
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clickStats, setClickStats] = useState<Record<string, ClickStats>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchLinks();
    fetchCampaigns();
  }, [companyId]);

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, source")
      .eq("company_id", companyId)
      .order("name");
    if (data) setCampaigns(data);
  };

  const fetchLinks = async () => {
    const { data } = await supabase
      .from("tracking_links")
      .select("*")
      .eq("company_id", companyId)
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

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(getTrackingUrl(slug));
    toast.success("URL copiada!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este link?")) return;

    const { error } = await supabase.from("tracking_links").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Link excluído!");
      fetchLinks();
    }
  };

  const company = { id: companyId, name: "", whatsapp: companyWhatsapp };

  if (showCreateForm) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-xl text-foreground flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Criar Link Rastreável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTrackingLinkForm
            company={company}
            campaigns={campaigns}
            onSuccess={() => {
              setShowCreateForm(false);
              fetchLinks();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-base text-foreground">Links Rastreáveis</CardTitle>
          <Button
            className="gradient-primary text-primary-foreground"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Link
          </Button>
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
                            <Button variant="ghost" size="sm" onClick={() => copyUrl(link.slug)} title="Copiar URL">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(link.id)}
                              title="Excluir link"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
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
    </div>
  );
}
