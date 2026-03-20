import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  Shield,
  Headphones,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Company {
  id: string;
  name: string;
}

interface UserInfo {
  user_id: string;
  full_name: string;
  role: string;
}

type AccessMap = Record<string, Set<string>>; // userId -> Set<companyId>

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  gerente: { label: "Gerente", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: Shield },
  operador: { label: "Operador", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: Headphones },
  client: { label: "Cliente", color: "text-primary bg-primary/10 border-primary/30", icon: Users },
  member: { label: "Membro", color: "text-muted-foreground bg-secondary border-border", icon: Users },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function AccessManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [accessMap, setAccessMap] = useState<AccessMap>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null); // "userId-companyId"
  const [deleteTarget, setDeleteTarget] = useState<UserInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const [companiesRes, profilesRes, rolesRes, clientCompaniesRes] = await Promise.all([
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("client_companies").select("user_id, company_id"),
    ]);

    const roleMap: Record<string, string> = {};
    rolesRes.data?.forEach((r) => (roleMap[r.user_id] = r.role));

    // Exclude admins from the matrix — they see everything
    const nonAdminUsers: UserInfo[] =
      profilesRes.data
        ?.filter((p) => roleMap[p.user_id] && roleMap[p.user_id] !== "admin")
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name || "—",
          role: roleMap[p.user_id] || "client",
        }))
        .sort((a, b) => {
          const order = ["gerente", "operador", "client", "member"];
          return order.indexOf(a.role) - order.indexOf(b.role);
        }) || [];

    const map: AccessMap = {};
    clientCompaniesRes.data?.forEach(({ user_id, company_id }) => {
      if (!map[user_id]) map[user_id] = new Set();
      map[user_id].add(company_id);
    });

    setCompanies(companiesRes.data || []);
    setUsers(nonAdminUsers);
    setAccessMap(map);
    setLoading(false);
  };

  const toggleAccess = async (userId: string, companyId: string) => {
    const key = `${userId}-${companyId}`;
    const hasAccess = accessMap[userId]?.has(companyId);

    setToggling(key);

    if (hasAccess) {
      // Remove access
      const { error } = await supabase
        .from("client_companies")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", companyId);

      if (error) {
        toast.error("Erro ao remover acesso");
      } else {
        setAccessMap((prev) => {
          const updated = { ...prev };
          updated[userId] = new Set(updated[userId]);
          updated[userId].delete(companyId);
          return updated;
        });
        toast.success("Acesso removido");
      }
    } else {
      // Grant access
      const { error } = await supabase
        .from("client_companies")
        .insert({ user_id: userId, company_id: companyId });

      if (error) {
        toast.error("Erro ao conceder acesso");
      } else {
        setAccessMap((prev) => {
          const updated = { ...prev };
          if (!updated[userId]) updated[userId] = new Set();
          updated[userId] = new Set(updated[userId]);
          updated[userId].add(companyId);
          return updated;
        });
        toast.success("Acesso concedido");
      }
    }

    setToggling(null);
  };

  const getUserCompanyCount = (userId: string) => accessMap[userId]?.size || 0;

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-client-user", {
        body: { user_id: deleteTarget.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Usuário "${deleteTarget.full_name}" excluído com sucesso`);
      setDeleteTarget(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir usuário");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Gestão de Acessos</h1>
        <p className="text-sm text-muted-foreground">
          Controle quais usuários têm acesso a cada empresa
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{companies.length}</p>
              <p className="text-xs text-muted-foreground">Empresas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Usuários ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Object.values(accessMap).reduce((sum, set) => sum + set.size, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Vínculos ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {users.length === 0 || companies.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="mb-3 h-12 w-12" />
            <p className="text-sm">
              {users.length === 0 ? "Nenhum usuário cadastrado ainda" : "Nenhuma empresa cadastrada ainda"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Matriz de Acesso
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Marque as caixas para conceder ou revogar acesso a uma empresa
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="sticky left-0 z-10 bg-card/80 backdrop-blur-sm p-4 text-left text-xs font-semibold text-muted-foreground min-w-[220px]">
                    Usuário
                  </th>
                  {companies.map((company) => (
                    <th
                      key={company.id}
                      className="p-3 text-center text-xs font-semibold text-muted-foreground min-w-[140px] max-w-[160px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="truncate max-w-[120px]" title={company.name}>
                          {company.name}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="p-3 text-center text-xs font-semibold text-muted-foreground min-w-[80px]">
                    Total
                  </th>
                  <th className="p-3 text-center text-xs font-semibold text-muted-foreground min-w-[60px]">
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.client;
                  const RoleIcon = roleConf.icon;
                  const count = getUserCompanyCount(user.user_id);

                  return (
                    <tr
                      key={user.user_id}
                      className={`border-b border-border transition-colors hover:bg-secondary/30 ${
                        idx % 2 === 0 ? "" : "bg-secondary/10"
                      }`}
                    >
                      {/* User info */}
                      <td className="sticky left-0 z-10 bg-card/80 backdrop-blur-sm p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {getInitials(user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate max-w-[130px]">
                              {user.full_name}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] mt-0.5 ${roleConf.color}`}
                            >
                              <RoleIcon className="mr-1 h-2.5 w-2.5" />
                              {roleConf.label}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      {/* Company checkboxes */}
                      {companies.map((company) => {
                        const hasAccess = accessMap[user.user_id]?.has(company.id) ?? false;
                        const isToggling = toggling === `${user.user_id}-${company.id}`;

                        return (
                          <td key={company.id} className="p-3 text-center">
                            <div className="flex items-center justify-center">
                              {isToggling ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              ) : (
                                <div className="relative group">
                                  <Checkbox
                                    checked={hasAccess}
                                    onCheckedChange={() => toggleAccess(user.user_id, company.id)}
                                    className={`h-5 w-5 rounded cursor-pointer transition-all ${
                                      hasAccess
                                        ? "border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        : "border-border hover:border-primary/50"
                                    }`}
                                  />
                                  {/* Tooltip hint */}
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                    {hasAccess ? "Remover acesso" : "Conceder acesso"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total count */}
                      <td className="p-3 text-center">
                        {count > 0 ? (
                          <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                            {count}
                          </Badge>
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(user)}
                          title={`Excluir ${user.full_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.full_name}</strong>? Esta ação é irreversível e removerá todos os acessos e dados do usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Legenda:</span>
        {Object.entries(ROLE_CONFIG).map(([role, conf]) => {
          const Icon = conf.icon;
          return (
            <span key={role} className="flex items-center gap-1">
              <Badge variant="outline" className={`text-[10px] ${conf.color}`}>
                <Icon className="mr-1 h-2.5 w-2.5" />
                {conf.label}
              </Badge>
            </span>
          );
        })}
        <span className="ml-2">· Admins têm acesso global automático e não aparecem na tabela</span>
      </div>
    </div>
  );
}
