import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, FileText, Briefcase, CalendarClock, Wallet, MessageSquare, StickyNote, Phone, Mail, MapPin } from "lucide-react";
import { ClientPersonalDataForm, ClientData } from "@/components/clients/ClientPersonalDataForm";
import { ClientGeneratedDocuments } from "@/components/clients/ClientGeneratedDocuments";
import { ClientUploadedDocuments } from "@/components/clients/ClientUploadedDocuments";
import { ClientAgreements } from "@/components/clients/ClientAgreements";
import { LeadCases } from "@/components/leads/LeadCases";
import { LeadReminders } from "@/components/leads/LeadReminders";
import { LeadNotes } from "@/components/leads/LeadNotes";
import { LeadConversationDrawer } from "@/components/leads/LeadConversationDrawer";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData | null>(null);
  const [companyId, setCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [convOpen, setConvOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id!)
      .maybeSingle();
    if (data) {
      setClient(data as ClientData);
      setCompanyId((data as any).company_id);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando pasta...</div>;
  if (!client) return <div className="p-8 text-center text-muted-foreground">Cliente não encontrado.</div>;

  const enderecoCompleto = [
    client.endereco_rua,
    client.endereco_numero,
    client.endereco_bairro,
    client.endereco_cidade,
    client.endereco_estado,
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">Cliente</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                {client.cpf_cliente_final && <span>CPF: {client.cpf_cliente_final}</span>}
                {client.whatsapp && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.whatsapp}</span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
                )}
                {enderecoCompleto && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{enderecoCompleto}</span>
                )}
              </div>
              {(client.area_direito || client.tipo_caso_detalhado) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {client.area_direito && <Badge variant="outline">{client.area_direito}</Badge>}
                  {client.tipo_caso_detalhado && <Badge variant="outline">{client.tipo_caso_detalhado}</Badge>}
                </div>
              )}
            </div>
            <Button variant="outline" onClick={() => setConvOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ver conversas
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="dados"><User className="h-4 w-4 mr-1" />Dados</TabsTrigger>
          <TabsTrigger value="documentos"><FileText className="h-4 w-4 mr-1" />Documentos</TabsTrigger>
          <TabsTrigger value="processos"><Briefcase className="h-4 w-4 mr-1" />Processos</TabsTrigger>
          <TabsTrigger value="agenda"><CalendarClock className="h-4 w-4 mr-1" />Agenda</TabsTrigger>
          <TabsTrigger value="financeiro"><Wallet className="h-4 w-4 mr-1" />Financeiro</TabsTrigger>
          <TabsTrigger value="notas"><StickyNote className="h-4 w-4 mr-1" />Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <ClientPersonalDataForm client={client} onSaved={fetchClient} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <ClientGeneratedDocuments lead={client} companyId={companyId} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <ClientUploadedDocuments lead={client} companyId={companyId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processos" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <LeadCases leadId={client.id} companyId={companyId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <LeadReminders leadId={client.id} companyId={companyId} leadName={client.name} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <ClientAgreements lead={client} companyId={companyId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notas" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <LeadNotes leadId={client.id} companyId={companyId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LeadConversationDrawer
        open={convOpen}
        onOpenChange={setConvOpen}
        leadId={client.id}
        leadName={client.name}
        leadCpf={client.cpf_cliente_final}
        leadPhone={client.whatsapp || client.phone}
      />
    </div>
  );
}
