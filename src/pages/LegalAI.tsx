import { useEffect, useMemo, useRef, useState } from "react";
import {
  Scale,
  FileText,
  Send,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Loader2,
  Lock,
  ScrollText,
  FileSignature,
  Gavel,
  ShieldAlert,
  Paperclip,
  X,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { maskCnj, validateCnj } from "@/lib/cnj";

interface Conversation {
  id: string;
  title: string;
  document_type: string | null;
  updated_at: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  is_document?: boolean;
  document_type?: string | null;
  created_at?: string;
}

const TEMPLATES = [
  {
    key: "peticao_inicial",
    label: "Petição Inicial",
    icon: ScrollText,
    prompt:
      "Preciso de uma petição inicial completa. Vou te passar os dados do caso a seguir. Estruture com endereçamento, qualificação, fatos, fundamentos jurídicos, pedidos, valor da causa e requerimentos. Caso falte algum dado, me pergunte de forma numerada.",
  },
  {
    key: "mandado_seguranca",
    label: "Mandado de Segurança",
    icon: ShieldAlert,
    prompt:
      "Preciso impetrar um Mandado de Segurança. Vou descrever o ato coator e a autoridade. Estruture a peça com o cabeçalho, qualificação, dos fatos, do direito líquido e certo, da liminar, dos pedidos. Pergunte o que faltar.",
  },
  {
    key: "contrato",
    label: "Contrato",
    icon: FileSignature,
    prompt:
      "Preciso redigir um contrato. Vou te informar o tipo (prestação de serviços, compra e venda, locação, honorários, etc.) e as partes. Estruture com qualificação, objeto, obrigações, prazo, valor, rescisão, foro. Pergunte os dados que faltarem.",
  },
  {
    key: "recurso",
    label: "Recurso / Contestação",
    icon: Gavel,
    prompt:
      "Preciso redigir uma peça recursal ou contestação. Vou descrever a decisão a ser combatida ou a inicial a ser contestada. Estruture com preliminares, mérito, pedidos. Pergunte o que faltar.",
  },
  {
    key: "impugnacao",
    label: "Impugnação",
    icon: FileText,
    prompt:
      "Preciso de uma impugnação (ao cálculo / à contestação / ao valor da causa / à assistência judiciária). Informe o número do processo no campo CNJ e/ou anexe a peça a ser impugnada. Analise os dados do processo, aponte os pontos impugnáveis e redija a peça completa.",
  },
  {
    key: "agravo",
    label: "Agravo de Instrumento",
    icon: Gavel,
    prompt:
      "Preciso de um Agravo de Instrumento. Use o número do processo (CNJ) e/ou o documento anexado com a decisão interlocutória agravada. Estruture com cabeçalho, tempestividade, cabimento (art. 1.015 CPC), síntese da controvérsia, razões do agravo, pedido de efeito suspensivo/antecipação de tutela recursal e pedidos finais.",
  },
  {
    key: "embargos",
    label: "Embargos",
    icon: ScrollText,
    prompt:
      "Preciso de embargos (de declaração ou à execução). Informe o número do processo (CNJ) e/ou anexe a decisão/sentença. Aponte com precisão a omissão, contradição, obscuridade ou erro material e redija a peça com fundamentação (arts. 1.022 e ss. do CPC).",
  },
];


export default function LegalAI() {
  const { user } = useAuth();
  const { companyIds, loading: loadingCompanies } = useUserCompanies();
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [processNumber, setProcessNumber] = useState("");
  const [files, setFiles] = useState<Array<{ name: string; mimeType: string; dataUrl: string }>>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Validação do CNJ (máscara + dígito verificador + tribunal)
  const cnjCheck = useMemo(() => validateCnj(processNumber), [processNumber]);
  const cnjTouched = processNumber.trim().length > 0;
  const cnjInvalid = cnjTouched && !cnjCheck.valid;

  const handlePickFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const picked = Array.from(list).slice(0, 5);
    const converted: Array<{ name: string; mimeType: string; dataUrl: string }> = [];
    for (const f of picked) {
      if (f.size > 12 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Arquivo muito grande", description: `${f.name} passa de 12 MB.` });
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      converted.push({ name: f.name, mimeType: f.type || "application/pdf", dataUrl });
    }
    setFiles((prev) => [...prev, ...converted].slice(0, 5));
  };


  // Carrega empresas pagas (mensalidade_zionads) acessíveis
  useEffect(() => {
    if (!user || loadingCompanies) return;
    const load = async () => {
      let query = supabase
        .from("companies")
        .select("id, name, partnership_type, billing_model")
        
      if (companyIds.length > 0) {
        query = query.in("id", companyIds);
      }
      const { data } = await query;
      const list = (data || [])
        .filter((c: any) => c.billing_model === 'plan_completo' || c.billing_model === 'crm_full' || c.billing_model === 'plan_free' || c.billing_model === 'plan_zionads' || (c.billing_model?.startsWith('plan_ia_') ?? false))
        .map((c) => ({ id: c.id, name: c.name }));
      setCompanies(list);
      if (list.length > 0) {
        setActiveCompanyId((prev) => prev || list[0].id);
        setAccessAllowed(true);
      } else {
        setAccessAllowed(false);
      }
    };
    load();
  }, [user, loadingCompanies, companyIds.join(",")]);

  // Carrega conversas da empresa
  useEffect(() => {
    if (!activeCompanyId || !user) return;
    const load = async () => {
      console.log("[LegalAI] Loading conversations for company:", activeCompanyId);
      const { data, error } = await supabase
        .from("legal_ai_conversations")
        .select("id, title, document_type, updated_at")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (error) {
        console.error("[LegalAI] Error loading conversations:", error);
      } else {
        console.log("[LegalAI] Conversations loaded:", data?.length);
        setConversations(data || []);
      }
    };
    load();
  }, [activeCompanyId, user]);

  // Carrega mensagens da conversa ativa
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("legal_ai_messages")
        .select("id, role, content, is_document, document_type, created_at")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });
      setMessages(
        (data || []).map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          is_document: m.is_document,
          document_type: m.document_type,
          created_at: m.created_at,
        }))
      );
    };
    load();
  }, [activeConvId]);

  // Scroll auto
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setPendingDocType(null);
    setProcessNumber("");
    setFiles([]);
    setInput("");
    toast({
      title: "Nova conversa",
      description: "Descreva o caso ou escolha um modelo rápido para começar.",
    });
    // dá foco no campo de mensagem para ficar claro que iniciou
    setTimeout(() => textareaRef.current?.focus(), 50);
  };


  const handleTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setInput(tpl.prompt);
    setPendingDocType(tpl.key);
  };

  const handleDelete = async (convId: string) => {
    if (!confirm("Excluir esta conversa?")) return;
    await supabase.from("legal_ai_conversations").delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) handleNewChat();
  };

  const handleSend = async () => {
    if (!input.trim() || !activeCompanyId || streaming) return;
    const attachments = files;

    // Valida CNJ (quando informado) antes de gastar chamada de IA
    let cnj = "";
    if (processNumber.trim()) {
      const check = validateCnj(processNumber);
      if (!check.valid) {
        toast({
          variant: "destructive",
          title: "Número do processo inválido",
          description: check.error,
        });
        return;
      }
      cnj = check.formatted;
      setProcessNumber(check.formatted);

      // Confere se o processo existe na base pública antes de seguir
      try {
        const { data, error } = await supabase.functions.invoke("datajud-search", {
          body: { cnj: check.digits, save: false },
        });
        if (!error && data && (data as { ok?: boolean }).ok === false) {
          toast({
            variant: "destructive",
            title: "Processo não encontrado",
            description: `Nenhum registro para ${check.formatted} no ${check.tribunal ?? "tribunal informado"} (base pública DataJud/CNJ). Confira o número ou envie a decisão em anexo.`,
          });
          return;
        }
      } catch {
        // Se a consulta falhar, segue o fluxo — a IA avisa que não obteve os dados oficiais
      }
    }

    const suffix =
      (cnj ? `\n\n[Processo: ${cnj}]` : "") +
      (attachments.length ? `\n\n[Anexos: ${attachments.map((f) => f.name).join(", ")}]` : "");
    const userMsg: Message = { role: "user", content: input.trim() + suffix };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setFiles([]);
    setStreaming(true);


    // Coloca placeholder de assistant
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-ai-chat`;
      console.log("[LegalAI] Sending request to:", url, {
        conversationId: activeConvId,
        companyId: activeCompanyId,
        documentType: pendingDocType
      });

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: activeConvId,
          companyId: activeCompanyId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          documentType: pendingDocType,
          attachments,
          processNumber: cnj || undefined,
        }),

      });

      console.log("[LegalAI] Response status:", resp.status);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      const newConvId = resp.headers.get("X-Conversation-Id");
      if (newConvId && !activeConvId) {
        setActiveConvId(newConvId);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantText += c;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Recarrega lista de conversas
      const { data } = await supabase
        .from("legal_ai_conversations")
        .select("id, title, document_type, updated_at")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      setConversations(data || []);
      setPendingDocType(null);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erro na IA Jurídica",
        description: e.message || "Tente novamente",
      });
      setMessages((prev) => prev.slice(0, -1)); // remove placeholder
    } finally {
      setStreaming(false);
    }
  };

  const handleExportDocx = async (msg: Message) => {
    const paragraphs = msg.content.split("\n").map((line) => {
      const trimmed = line.trim();
      if (/^#\s/.test(trimmed)) {
        return new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: trimmed.replace(/^#\s/, ""), bold: true })],
        });
      }
      if (/^##\s/.test(trimmed)) {
        return new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed.replace(/^##\s/, ""), bold: true })],
        });
      }
      // remove markdown bold
      const cleaned = line.replace(/\*\*(.+?)\*\*/g, "$1");
      return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun(cleaned || " ")],
      });
    });

    const doc = new Document({
      styles: {
        default: { document: { run: { font: "Times New Roman", size: 24 } } },
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1701, right: 1701, bottom: 1701, left: 2268 },
            },
          },
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const filename = `documento-${Date.now()}.docx`;
    saveAs(blob, filename);
    toast({ title: "Documento exportado", description: filename });
  };

  // ====== RENDER ======
  if (loadingCompanies || accessAllowed === null) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accessAllowed === false) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
            <Lock className="h-7 w-7 text-accent" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">IA Jurídica indisponível</h2>
          <p className="text-sm text-muted-foreground">
            Este recurso premium está disponível apenas para escritórios no **Plano Completo**.
            Faça o upgrade da sua assinatura para liberar o acesso à Helena.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3 p-3 md:p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              IA Jurídica
              <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] uppercase">Premium</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Dra. Helena · advogada sênior · 30+ anos · doutora em Direito
            </p>
          </div>
        </div>
        {companies.length > 1 && (
          <Select value={activeCompanyId || ""} onValueChange={setActiveCompanyId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Layout */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-[260px_1fr]">
        {/* Sidebar de conversas */}
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b p-3">
            <Button onClick={handleNewChat} className="w-full" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Nova conversa
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {conversations.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Nenhuma conversa ainda
                </p>
              )}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-2 text-xs cursor-pointer transition-colors",
                    activeConvId === c.id
                      ? "bg-accent/15 text-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                  onClick={() => setActiveConvId(c.id)}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{c.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id);
                    }}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat */}
        <Card className="flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
              <div className="text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-accent" />
                <h2 className="text-lg font-semibold">Como posso ajudar hoje?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use um dos modelos rápidos ou descreva seu caso livremente.
                </p>
              </div>
              <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    onClick={() => handleTemplate(tpl)}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left text-sm transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <tpl.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{tpl.label}</div>
                      <div className="line-clamp-2 text-[11px] text-muted-foreground">
                        {tpl.prompt.slice(0, 80)}...
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea ref={scrollRef as any} className="flex-1">
              <div className="space-y-4 p-4">
                {messages.map((m, i) => (
                  <div
                    key={m.id || i}
                    className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {m.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        <Scale className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-3 text-sm",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 border border-border"
                      )}
                    >
                      {m.role === "assistant" ? (
                        <>
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:my-2 prose-strong:text-foreground">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content || (streaming && i === messages.length - 1 ? "▋" : "")}
                            </ReactMarkdown>
                          </div>
                          {m.content.length > 400 && !streaming && (
                            <div className="mt-3 flex justify-end border-t border-border pt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportDocx(m)}
                                className="h-7 text-xs"
                              >
                                <Download className="mr-1.5 h-3 w-3" />
                                Exportar .docx
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Input */}
          <div className="border-t bg-card p-3">
            {/* CNJ + anexos */}
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="sm:max-w-[340px] sm:flex-1">
                <Input
                  value={processNumber}
                  onChange={(e) => setProcessNumber(maskCnj(e.target.value))}
                  inputMode="numeric"
                  aria-invalid={cnjInvalid}
                  aria-label="Número do processo (CNJ)"
                  placeholder="0000000-00.0000.0.00.0000"
                  className={cn(
                    "h-9 text-xs",
                    cnjInvalid && "border-destructive focus-visible:ring-destructive",
                  )}
                  disabled={streaming}
                />
                {cnjInvalid && (
                  <p className="mt-1 text-[11px] text-destructive">{cnjCheck.error}</p>
                )}
                {cnjTouched && cnjCheck.valid && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    CNJ válido · {cnjCheck.tribunal} — a IA vai consultar as movimentações
                    oficiais no DataJud/CNJ.
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  handlePickFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={streaming}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" /> Anexar PDF/imagem
              </Button>
            </div>

            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <Badge key={`${f.name}-${i}`} variant="secondary" className="gap-1 text-[11px]">
                    <FileText className="h-3 w-3" />
                    {f.name}
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-1 rounded hover:text-destructive"
                      aria-label={`Remover ${f.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}


            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Descreva o caso, peça uma petição, contrato, parecer... (Enter envia, Shift+Enter quebra linha)"
                className="min-h-[60px] resize-none text-sm"
                disabled={streaming}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="h-auto"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {pendingDocType && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Modelo selecionado: <strong>{TEMPLATES.find((t) => t.key === pendingDocType)?.label}</strong>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
