import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Users,
  Megaphone,
  Link2,
  Pencil,
  Eye,
  Trash2,
} from "lucide-react";

interface CompanyMetrics {
  leads: number;
  campaigns: number;
  trackingLinks: number;
}

interface CompanyCardProps {
  company: {
    id: string;
    name: string;
    website: string | null;
    whatsapp: string | null;
    created_at: string;
    partnership_type?: "exito" | "mensalidade_zionads" | null;
  };
  hasWhatsApp: boolean;
  metrics: CompanyMetrics;
  onConfigureWhatsApp: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CompanyCard({
  company,
  hasWhatsApp,
  metrics,
  onConfigureWhatsApp,
  onEdit,
  onDelete,
}: CompanyCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="glass-card transition-all hover:border-primary/20 group">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="font-display text-base text-foreground truncate">
              {company.name}
            </CardTitle>
            {company.whatsapp && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Phone className="h-3 w-3 shrink-0" /> {company.whatsapp}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="Excluir empresa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <MetricPill icon={Users} label="Leads" value={metrics.leads} />
          <MetricPill icon={Megaphone} label="Campanhas" value={metrics.campaigns} />
          <MetricPill icon={Link2} label="Links" value={metrics.trackingLinks} />
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasWhatsApp ? (
            <Badge variant="outline" className="border-success/30 text-success text-[10px]">
              <CheckCircle className="mr-1 h-3 w-3" /> WhatsApp Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="border-warning/30 text-warning text-[10px]">
              <AlertCircle className="mr-1 h-3 w-3" /> Sem WhatsApp
            </Badge>
          )}
          {company.partnership_type === "exito" ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]">
              🏆 Êxito
            </Badge>
          ) : (
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              💼 Mensalidade ZionAds
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => navigate(`/companies/${company.id}`)}
          >
            <Eye className="mr-2 h-3 w-3" />
            Ver detalhes
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onConfigureWhatsApp}
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/60">
          Cadastrada em {new Date(company.created_at).toLocaleDateString("pt-BR")}
        </p>
      </CardContent>
    </Card>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-secondary/50 py-2 px-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mb-1" />
      <span className="font-display text-sm font-bold text-foreground">{value}</span>
      <span className="text-[9px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}
