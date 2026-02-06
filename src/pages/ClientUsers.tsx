import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Building2, Shield, Headphones } from "lucide-react";
import { toast } from "sonner";

interface ClientUser {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string;
  company_id: string;
  role: string;
}

interface Company {
  id: string;
  name: string;
}

export default function ClientUsers() {
  const { userRole } = useAuth();
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const isGerente = userRole === "gerente";

  useEffect(() => {
    fetchData();
  }, [userRole]);

  const fetchData = async () => {
    if (isGerente) {
      // Gerente: fetch only their company
      const { data: myCompanies } = await supabase
        .from("client_companies")
        .select("company_id");

      if (!myCompanies?.length) return;

      const companyIds = myCompanies.map((c) => c.company_id);

      const [companiesRes, clientCompaniesRes] = await Promise.all([
        supabase.from("companies").select("id, name").in("id", companyIds),
        supabase.from("client_companies").select("id, user_id, company_id").in("company_id", companyIds),
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (companiesRes.data?.[0]) setSelectedCompanyId(companiesRes.data[0].id);

      await buildClientList(clientCompaniesRes.data || [], companiesRes.data || []);
    } else {
      // Admin: fetch all
      const [companiesRes, clientCompaniesRes] = await Promise.all([
        supabase.from("companies").select("id, name"),
        supabase.from("client_companies").select("id, user_id, company_id"),
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      await buildClientList(clientCompaniesRes.data || [], companiesRes.data || []);
    }
  };

  const buildClientList = async (
    clientCompanies: { id: string; user_id: string; company_id: string }[],
    companiesData: Company[]
  ) => {
    const companyMap: Record<string, string> = {};
    companiesData.forEach((c) => (companyMap[c.id] = c.name));

    const userIds = clientCompanies.map((cc) => cc.user_id);
    if (userIds.length === 0) {
      setClients([]);
      return;
    }

    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
    ]);

    const profileMap: Record<string, string> = {};
    profilesRes.data?.forEach((p) => (profileMap[p.user_id] = p.full_name));

    const roleMap: Record<string, string> = {};
    rolesRes.data?.forEach((r) => (roleMap[r.user_id] = r.role));

    const clientList: ClientUser[] = clientCompanies.map((cc) => ({
      id: cc.id,
      user_id: cc.user_id,
      full_name: profileMap[cc.user_id] || "—",
      company_name: companyMap[cc.company_id] || "—",
      company_id: cc.company_id,
      role: roleMap[cc.user_id] || "client",
    }));

    setClients(clientList);
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const fullName = formData.get("full_name") as string;
    const companyId = isGerente ? selectedCompanyId : (formData.get("company_id") as string);
    const role = isGerente ? "operador" : (formData.get("role") as string) || "gerente";

    if (!email || !fullName || !companyId) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-client-user", {
      body: { email, password: "123456", full_name: fullName, company_id: companyId, role },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao criar usuário");
    } else {
      const roleLabel = role === "gerente" ? "Gerente" : "Operador";
      toast.success(`${roleLabel} criado com sucesso! Email: ${email} | Senha padrão: 123456`);
      setDialogOpen(false);
      fetchData();
    }

    setLoading(false);
  };

  const getRoleBadge = (role: string) => {
    if (role === "gerente") {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Shield className="mr-1 h-3 w-3" /> Gerente
        </Badge>
      );
    }
    if (role === "operador") {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Headphones className="mr-1 h-3 w-3" /> Operador
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-primary/30 text-primary">
        Cliente
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isGerente ? "Equipe" : "Usuários das Empresas"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isGerente
              ? "Gerencie os operadores da sua empresa"
              : "Gerencie gerentes e operadores das empresas"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <UserPlus className="mr-2 h-4 w-4" />
              {isGerente ? "Novo Operador" : "Novo Usuário"}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-foreground">
            <DialogHeader>
              <DialogTitle className="font-display">
                {isGerente ? "Adicionar Operador" : "Criar Usuário da Empresa"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input name="full_name" required placeholder="Nome do usuário" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input name="email" type="email" required placeholder="usuario@empresa.com" />
              </div>

              {!isGerente && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select name="role" defaultValue="gerente">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gerente">
                          <span className="flex items-center gap-2">
                            <Shield className="h-3 w-3" /> Gerente
                          </span>
                        </SelectItem>
                        <SelectItem value="operador">
                          <span className="flex items-center gap-2">
                            <Headphones className="h-3 w-3" /> Operador
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa *</Label>
                    <Select name="company_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Vincular a qual empresa?" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="rounded-lg border border-border bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {isGerente ? (
                    <>
                      O operador terá acesso às <strong className="text-foreground">Conversas</strong> e{" "}
                      <strong className="text-foreground">Kanban</strong>, podendo atender leads e alterar status.
                      <br />
                      <strong className="text-foreground">Senha padrão: 123456</strong>
                    </>
                  ) : (
                    <>
                      <strong className="text-foreground">Gerente:</strong> configura IA, adiciona operadores,
                      acessa Dashboard/Kanban/Conversas.
                      <br />
                      <strong className="text-foreground">Operador:</strong> atende mensagens e movimenta leads no Kanban.
                      <br />
                      <strong className="text-foreground">Senha padrão: 123456</strong>
                    </>
                  )}
                </p>
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? "Criando..." : "Criar Acesso"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nome</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                {!isGerente && <TableHead className="text-muted-foreground">Empresa</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isGerente ? 2 : 3} className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8" />
                    <p>Nenhum usuário cadastrado</p>
                    <p className="text-xs">
                      {isGerente
                        ? "Adicione operadores para atender os leads"
                        : "Crie gerentes e operadores para as empresas"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium text-foreground">{client.full_name}</TableCell>
                    <TableCell>{getRoleBadge(client.role)}</TableCell>
                    {!isGerente && (
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          <Building2 className="mr-1 h-3 w-3" />
                          {client.company_name}
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
