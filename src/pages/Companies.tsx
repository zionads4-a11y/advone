import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Globe, Phone } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  website: string | null;
  whatsapp: string | null;
  created_at: string;
}

export default function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    if (data) setCompanies(data);
  };

  const handleAdd = async (formData: FormData) => {
    if (!user) return;
    const { error } = await supabase.from("companies").insert({
      name: formData.get("name") as string,
      website: (formData.get("website") as string) || null,
      whatsapp: (formData.get("whatsapp") as string) || null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Empresa criada com sucesso!");
      setDialogOpen(false);
      fetchCompanies();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">{companies.length} empresas cadastradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-foreground dark">
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input name="name" required placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input name="website" placeholder="https://exemplo.com.br" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input name="whatsapp" placeholder="(11) 99999-9999" />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground">Adicionar Empresa</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.length === 0 ? (
          <Card className="glass-card col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="mb-3 h-10 w-10" />
              <p>Nenhuma empresa cadastrada</p>
              <p className="text-xs">Cadastre sua primeira empresa para começar</p>
            </CardContent>
          </Card>
        ) : (
          companies.map((company) => (
            <Card key={company.id} className="glass-card transition-all hover:border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="font-display text-base text-foreground">{company.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {company.website && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                      {company.website}
                    </a>
                  </div>
                )}
                {company.whatsapp && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {company.whatsapp}
                  </div>
                )}
                <p className="text-xs text-muted-foreground/60">
                  Cadastrada em {new Date(company.created_at).toLocaleDateString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
