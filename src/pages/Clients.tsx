import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FolderOpen, UserCheck, Bell } from "lucide-react";

interface Client {
  id: string;
  name: string;
  cpf_cliente_final: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  area_direito: string | null;
  tipo_caso_detalhado: string | null;
  became_client_at: string | null;
  company_id: string;
}

interface Company {
  id: string;
  name: string;
}

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const [clientsRes, companiesRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, cpf_cliente_final, phone, whatsapp, email, area_direito, tipo_caso_detalhado, became_client_at, company_id")
        .eq("is_client", true)
        .order("became_client_at", { ascending: false }),
      supabase.from("companies").select("id, name"),
    ]);
    if (clientsRes.data) setClients(clientsRes.data as Client[]);
    if (companiesRes.data) {
      const map: Record<string, string> = {};
      companiesRes.data.forEach((c: Company) => { map[c.id] = c.name; });
      setCompanies(map);
    }
    setLoading(false);
  };

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.cpf_cliente_final?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.whatsapp?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-primary" />
            Clientes
          </h1>
          <p className="text-muted-foreground">Pasta digital de cada cliente do escritório</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>{filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Quando um lead for movido para a coluna "Ganho", ele aparece aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Área / Caso</TableHead>
                    <TableHead>Cliente desde</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/clientes/${c.id}`)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.cpf_cliente_final || "—"}</TableCell>
                      <TableCell className="text-sm">
                        <div>{c.whatsapp || c.phone || "—"}</div>
                        {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.area_direito ? (
                          <Badge variant="outline">{c.area_direito}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {c.tipo_caso_detalhado && (
                          <div className="text-xs text-muted-foreground mt-1">{c.tipo_caso_detalhado}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.became_client_at ? new Date(c.became_client_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/clientes/${c.id}`); }}>
                          <FolderOpen className="h-4 w-4 mr-1" />
                          Abrir pasta
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
