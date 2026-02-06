import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, DollarSign, Users, TrendingUp } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  source: "google" | "meta";
  budget: number;
  status: string;
  created_at: string;
}

interface CompanyCampaignsProps {
  companyId: string;
}

export function CompanyCampaigns({ companyId }: CompanyCampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    const [campaignsRes, leadsRes] = await Promise.all([
      supabase
        .from("campaigns")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase.from("leads").select("campaign_id").eq("company_id", companyId),
    ]);

    if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[]);
    if (leadsRes.data) {
      const counts: Record<string, number> = {};
      leadsRes.data.forEach((l) => {
        if (l.campaign_id) counts[l.campaign_id] = (counts[l.campaign_id] || 0) + 1;
      });
      setLeadCounts(counts);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">Campanhas</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.length === 0 ? (
          <Card className="glass-card col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Megaphone className="mb-3 h-10 w-10" />
              <p>Nenhuma campanha cadastrada</p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="glass-card transition-all hover:border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-display text-base text-foreground">
                    {campaign.name}
                  </CardTitle>
                  <Badge variant="outline" className="border-info/30 text-info">
                    {campaign.source === "google" ? "Google" : "Meta"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" /> Orçamento
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    R$ {Number(campaign.budget).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> Leads
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {leadCounts[campaign.id] || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> Status
                  </span>
                  <Badge variant="outline" className="border-success/30 text-success text-xs">
                    {campaign.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
