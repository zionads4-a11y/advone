import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, DollarSign } from "lucide-react";
import { toast } from "sonner";

type LeadStatus = "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  value: number;
  source: string | null;
  company_id: string;
  created_at: string;
}

const columns: { status: LeadStatus; label: string; color: string }[] = [
  { status: "new", label: "Novos", color: "hsl(38, 92%, 50%)" },
  { status: "contacted", label: "Contatados", color: "hsl(210, 100%, 52%)" },
  { status: "qualified", label: "Qualificados", color: "hsl(153, 60%, 45%)" },
  { status: "negotiating", label: "Negociando", color: "hsl(200, 80%, 50%)" },
  { status: "won", label: "Vendidos", color: "hsl(153, 60%, 45%)" },
  { status: "lost", label: "Perdidos", color: "hsl(0, 72%, 51%)" },
];

export default function Kanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [leadsRes, companiesRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name"),
    ]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (companiesRes.data) {
      const map: Record<string, string> = {};
      companiesRes.data.forEach((c) => (map[c.id] = c.name));
      setCompanies(map);
    }
  };

  const updateStatus = async (leadId: string, newStatus: LeadStatus) => {
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      toast.success("Status atualizado!");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Kanban</h1>
        <p className="text-sm text-muted-foreground">Arraste os leads entre as colunas ou altere o status</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.status);
          return (
            <div key={col.status} className="min-w-[280px] flex-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: col.color }} />
                <h3 className="font-display text-sm font-semibold text-foreground">{col.label}</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{colLeads.length}</Badge>
              </div>

              <div className="space-y-2">
                {colLeads.map((lead) => (
                  <Card key={lead.id} className="glass-card cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="mb-2 flex items-start justify-between">
                        <p className="text-sm font-medium text-foreground">{lead.name}</p>
                        {lead.source && (
                          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                            {lead.source === "google" ? "Google" : "Meta"}
                          </Badge>
                        )}
                      </div>

                      <p className="mb-2 text-xs text-muted-foreground">{companies[lead.company_id] || "—"}</p>

                      <div className="mb-3 space-y-1">
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </div>
                        )}
                        {lead.value > 0 && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                            <DollarSign className="h-3 w-3" />
                            R$ {Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>

                      <Select
                        value={lead.status}
                        onValueChange={(val) => updateStatus(lead.id, val as LeadStatus)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((c) => (
                            <SelectItem key={c.status} value={c.status}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}

                {colLeads.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                    Nenhum lead
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
