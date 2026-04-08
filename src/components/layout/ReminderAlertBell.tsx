import { Bell, AlertTriangle, Clock, CalendarClock, DollarSign } from "lucide-react";
import { useReminderAlerts } from "@/hooks/useReminderAlerts";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ReminderAlertBell() {
  const { alerts, financialAlerts, alertCount, dismissAlert, dismissFinancialAlert } = useReminderAlerts();
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {alertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">Alertas</h4>
          {alertCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {alertCount} pendente{alertCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {alerts.length === 0 && financialAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">Nenhum alerta pendente</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Financial alerts */}
              {financialAlerts.map((alert) => {
                const isOverdue = alert.days_until < 0;
                const isToday = alert.days_until === 0;
                const amount = Number(alert.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                return (
                  <div
                    key={`fin-${alert.id}`}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 cursor-pointer ${
                      isOverdue ? "bg-destructive/5" : isToday ? "bg-warning/5" : ""
                    }`}
                    onClick={() => navigate("/financeiro")}
                  >
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isOverdue ? "bg-destructive/15 text-destructive" : isToday ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"
                    }`}>
                      <DollarSign className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{alert.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {amount} • {format(new Date(alert.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {isOverdue && (
                        <span className="text-[10px] font-medium text-destructive">⚠️ Vencida</span>
                      )}
                      {isToday && (
                        <span className="text-[10px] font-medium text-warning">💰 Vence hoje</span>
                      )}
                      {!isOverdue && !isToday && (
                        <span className="text-[10px] font-medium text-primary">📋 Vence em {alert.days_until} dia{alert.days_until > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissFinancialAlert(alert.id);
                      }}
                      className="shrink-0 text-muted-foreground/50 hover:text-foreground text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {/* Reminder alerts */}
              {alerts.map((alert) => {
                const isOverdue = isBefore(new Date(alert.due_at), new Date());
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 cursor-pointer ${
                      isOverdue ? "bg-destructive/5" : ""
                    }`}
                    onClick={() => navigate("/agenda")}
                  >
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isOverdue ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                    }`}>
                      {isOverdue ? <AlertTriangle className="h-3 w-3" /> : alert.reminder_type === "meeting" ? <CalendarClock className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{alert.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {alert.lead_name} • {format(new Date(alert.due_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                      {isOverdue && (
                        <span className="text-[10px] font-medium text-destructive">⚠️ Atrasado</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                      className="shrink-0 text-muted-foreground/50 hover:text-foreground text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {alertCount > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-primary"
              onClick={() => navigate("/agenda")}
            >
              Ver agenda completa
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
