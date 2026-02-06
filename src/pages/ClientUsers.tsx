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
import { UserPlus, Users, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ClientUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  company_name: string;
  company_id: string;
}

interface Company {
  id: string;
  name: string;
}

export default function ClientUsers() {
  const { session } = useAuth();
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [companiesRes, clientCompaniesRes] = await Promise.all([
      supabase.from("companies").select("id, name"),
      supabase.from("client_companies").select("id, user_id, company_id"),
    ]);

    if (companiesRes.data) setCompanies(companiesRes.data);

    if (clientCompaniesRes.data && companiesRes.data) {
      const companyMap: Record<string, string> = {};
      companiesRes.data.forEach((c) => (companyMap[c.id] = c.name));

      // Fetch profiles for each client
      const userIds = clientCompaniesRes.data.map((cc) => cc.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const profileMap: Record<string, string> = {};
        profiles?.forEach((p) => (profileMap[p.user_id] = p.full_name));

        // We need to get emails - but we can't query auth.users from client
        // We'll show what we have
        const clientList: ClientUser[] = clientCompaniesRes.data.map((cc) => ({
          id: cc.id,
          user_id: cc.user_id,
          email: "",
          full_name: profileMap[cc.user_id] || "—",
          company_name: companyMap[cc.company_id] || "—",
          company_id: cc.company_id,
        }));

        setClients(clientList);
      }
    }
  };

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;
    const companyId = formData.get("company_id") as string;

    if (!email || !password || !fullName || !companyId) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-client-user", {
      body: { email, password, full_name: fullName, company_id: companyId },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao criar cliente");
    } else {
      toast.success("Cliente criado com sucesso! Credenciais: " + email);
      setDialogOpen(false);
      fetchData();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Usuários Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o acesso dos seus clientes ao sistema
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <UserPlus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-foreground dark">
            <DialogHeader>
              <DialogTitle className="font-display">Criar Acesso para Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input name="full_name" required placeholder="Nome do cliente" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input name="email" type="email" required placeholder="cliente@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
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

              <div className="rounded-lg border border-border bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground">
                  O cliente terá acesso ao <strong className="text-foreground">Dashboard</strong> e{" "}
                  <strong className="text-foreground">Kanban</strong> da empresa selecionada, podendo visualizar leads
                  e alterar status.
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
                <TableHead className="text-muted-foreground">Empresa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8" />
                    <p>Nenhum cliente cadastrado</p>
                    <p className="text-xs">Crie um acesso para que seus clientes possam acompanhar os leads</p>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium text-foreground">{client.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        <Building2 className="mr-1 h-3 w-3" />
                        {client.company_name}
                      </Badge>
                    </TableCell>
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
