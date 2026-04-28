import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, Send, Loader2, CheckCircle2, XCircle, Clock, FileText, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { GenerateDocumentDialog } from "@/components/clients/GenerateDocumentDialog";

interface LeadContractProps {
  leadId: string;
  companyId: string;
  leadName: string;
  leadPhone?: string | null;
  leadEmail?: string | null;
}

interface ContractDoc {
  id: string;
  document_name: string;
  status: string;
  sign_url: string | null;
  signer_name: string;
  created_at: string;
  signed_at: string | null;
  sent_via_whatsapp: boolean;
}

const statusMap: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Aguardando assinatura", icon: Clock, className: "bg-warning/15 text-warning border-warning/30" },
  signed: { label: "Assinado", icon: CheckCircle2, className: "bg-success/15 text-success border-success/30" },
  refused: { label: "Recusado", icon: XCircle, className: "bg-destructive/15 text-destructive border-destructive/30" },
  canceled: { label: "Cancelado", icon: XCircle, className: "bg-muted text-muted-foreground border-border" },
};

export function LeadContract({ leadId, companyId, leadName, leadPhone, leadEmail }: LeadContractProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ContractDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateDocOpen, setGenerateDocOpen] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  // Form state
  const [signerName, setSignerName] = useState(leadName);
  const [signerPhone, setSignerPhone] = useState(leadPhone || "");
  const [signerEmail, setSignerEmail] = useState(leadEmail || "");
  const [docName, setDocName] = useState(`Contrato - ${leadName}`);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);

  useEffect(() => {
    fetchData();
  }, [leadId, companyId]);

  const fetchData = async () => {
    setLoading(true);
    const [docsRes, configRes] = await Promise.all([
      supabase
        .from("zapsign_documents")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("zapsign_configs")
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);

    if (docsRes.data) {
      setDocuments(docsRes.data as unknown as ContractDoc[]);
    }
    setHasConfig(!!configRes.data);
    setLoading(false);
  };

  const handleSendContract = async () => {
    if (!signerName.trim()) {
      toast.error("Nome do assinante é obrigatório");
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        setSending(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapsign-create-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            lead_id: leadId,
            signer_name: signerName.trim(),
            signer_phone: signerPhone.trim() || undefined,
            signer_email: signerEmail.trim() || undefined,
            document_name: docName.trim(),
            send_whatsapp: sendWhatsapp,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast.error(err.error || "Erro ao criar contrato");
        setSending(false);
        return;
      }

      toast.success("Contrato enviado com sucesso!");
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Erro de conexão");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando contratos...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileSignature className="h-3.5 w-3.5" />
          Contratos Digitais
        </h4>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setGenerateDocOpen(true)}
          >
            <FilePlus2 className="h-3 w-3 mr-1" />
            Gerar contrato
          </Button>
          {hasConfig && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(true)}>
              <Send className="h-3 w-3 mr-1" />
              Enviar p/ assinatura
            </Button>
          )}
        </div>
      </div>

      {!hasConfig && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          ZapSign não configurada. Configure em Configurações da empresa.
        </p>
      )}

      {documents.length === 0 && hasConfig && (
        <p className="text-xs text-muted-foreground">Nenhum contrato enviado.</p>
      )}

      {documents.map((doc) => {
        const st = statusMap[doc.status] || statusMap.pending;
        const Icon = st.icon;
        return (
          <div key={doc.id} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{doc.document_name}</span>
              </div>
              <Badge variant="outline" className={`shrink-0 text-[10px] ${st.className}`}>
                <Icon className="h-3 w-3 mr-1" />
                {st.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>
              {doc.sent_via_whatsapp && <span>📱 Enviado via WhatsApp</span>}
              {doc.signed_at && <span>✅ {new Date(doc.signed_at).toLocaleDateString("pt-BR")}</span>}
            </div>
            {doc.sign_url && doc.status === "pending" && (
              <a
                href={doc.sign_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Abrir link de assinatura →
              </a>
            )}
          </div>
        );
      })}

      {/* Send Contract Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Enviar Contrato para Assinatura
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do contrato</Label>
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do assinante *</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone (WhatsApp)</Label>
              <Input value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Enviar link via WhatsApp</p>
                <p className="text-xs text-muted-foreground">O lead receberá o link para assinar</p>
              </div>
              <input
                type="checkbox"
                checked={sendWhatsapp}
                onChange={(e) => setSendWhatsapp(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendContract} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Document (saves to client folder) */}
      <GenerateDocumentDialog
        open={generateDocOpen}
        onOpenChange={setGenerateDocOpen}
        lead={{ id: leadId, name: leadName, phone: leadPhone, whatsapp: leadPhone, email: leadEmail }}
        companyId={companyId}
        onGenerated={() => {
          toast.success("Contrato salvo na pasta do cliente!");
        }}
      />
    </div>
  );
}
