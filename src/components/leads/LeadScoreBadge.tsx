import { Badge } from "@/components/ui/badge";
import { Flame, Thermometer, Snowflake } from "lucide-react";

const scoreConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  quente: {
    label: "Quente",
    icon: <Flame className="h-3 w-3" />,
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
  morno: {
    label: "Morno",
    icon: <Thermometer className="h-3 w-3" />,
    className: "bg-warning/15 text-warning border-warning/30",
  },
  frio: {
    label: "Frio",
    icon: <Snowflake className="h-3 w-3" />,
    className: "bg-info/15 text-info border-info/30",
  },
};

interface LeadScoreBadgeProps {
  score: string | null;
  size?: "sm" | "md";
}

export function LeadScoreBadge({ score, size = "sm" }: LeadScoreBadgeProps) {
  const config = scoreConfig[score || "morno"] || scoreConfig.morno;

  return (
    <Badge variant="outline" className={`${config.className} gap-1 ${size === "sm" ? "text-[9px]" : "text-[10px]"}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
