import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "success" | "warning" | "info";
}

const variantStyles = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

const iconBgStyles = {
  default: "bg-secondary",
  success: "bg-success/10",
  warning: "bg-warning/10",
  info: "bg-info/10",
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: MetricCardProps) {
  return (
    <Card className="glass-card transition-all hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className={`font-display text-2xl font-bold ${variantStyles[variant]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <p className={`text-xs font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
                {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% vs mês anterior
              </p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ${iconBgStyles[variant]}`}>
            <Icon className={`h-5 w-5 ${variantStyles[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
