import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "success" | "warning" | "info" | "accent";
}

const valueStyles = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  accent: "text-accent",
};

const iconStyles = {
  default: "bg-primary/10 text-primary border-primary/15",
  success: "bg-success/10 text-success border-success/15",
  warning: "bg-warning/10 text-warning border-warning/15",
  info: "bg-info/10 text-info border-info/15",
  accent: "bg-accent/15 text-accent border-accent/25",
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: MetricCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border/70 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-primary opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {title}
            </p>
            <p className={cn("font-display text-[26px] font-bold leading-tight tracking-tight", valueStyles[variant])}>
              {value}
            </p>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-1 pt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}
                >
                  {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className="text-[10px] text-muted-foreground">vs. mês anterior</span>
              </div>
            )}
          </div>
          <div className={cn("rounded-md border p-2.5 transition-transform group-hover:scale-105", iconStyles[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
