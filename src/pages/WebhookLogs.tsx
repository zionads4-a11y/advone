import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle, Clock, Search, RefreshCw, User, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WebhookLog {
  id: string;
  created_at: string;
  channel_id: string;
  resource_id: string | null;
  resource_state: string | null;
  status_code: number;
  error_message: string | null;
  processing_time_ms: number | null;
  user_id: string | null;
  profiles?: { full_name: string | null } | null;
}

export default function WebhookLogs() {
  const { user, userRole } = useAuth();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const isAllowed = userRole === "admin" || userRole === "member" || userRole === "gerente";

  const fetchLogs = async () => {
    if (!user || !isAllowed) return;
    setLoading(true);
    
    let query = supabase
      .from("google_calendar_webhook_logs")
      .select(`
        *,
        profiles:user_id (full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (search) {
      query = query.or(`channel_id.ilike.%${search}%,resource_state.ilike.%${search}%,error_message.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (!error) {
      setLogs(data as any[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // Realtime updates
    const channel = supabase
      .channel("webhook_logs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "google_calendar_webhook_logs" },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAllowed]);

  if (!isAllowed && userRole) {
    return <Navigate to="/dashboard" replace />;
  }

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (status >= 400) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs do Webhook</h1>
            <p className="text-sm text-muted-foreground">Monitoramento em tempo real do Google Calendar Sync</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID ou Erro..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total (50)", value: logs.length, icon: Activity, color: "text-blue-500" },
          { label: "Sucesso (2xx)", value: logs.filter(l => l.status_code >= 200 && l.status_code < 300).length, icon: CheckCircle2, color: "text-green-500" },
          { label: "Erros (4xx/5xx)", value: logs.filter(l => l.status_code >= 400).length, icon: AlertCircle, color: "text-red-500" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 opacity-20 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eventos Recentes</CardTitle>
          <CardDescription>Recebimento de notificações do Google</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recurso/Estado</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>ID do Canal</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum evento registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium uppercase text-xs">{log.resource_state || "—"}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {log.resource_id || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {log.profiles?.full_name || "Sistema / Anônimo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {log.processing_time_ms ? `${log.processing_time_ms}ms` : "—"}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">
                        {log.channel_id ? `${log.channel_id.substring(0, 12)}...` : "—"}
                      </TableCell>
                      <TableCell>
                        {log.error_message ? (
                          <span className="text-xs text-red-500 font-medium">{log.error_message}</span>
                        ) : (
                          <span className="text-xs text-green-600">OK</span>
                        )}
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
