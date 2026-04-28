# Códigos do Projeto

## Arquivo: src/App.tsx

```typescript
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Kanban from "./pages/Kanban";
import Conversations from "./pages/Conversations";
import Campaigns from "./pages/Campaigns";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import ClientUsers from "./pages/ClientUsers";
import AccessManagement from "./pages/AccessManagement";
import TrackingLinks from "./pages/TrackingLinks";
import ConnectWhatsApp from "@/pages/ConnectWhatsApp";
import Agenda from "./pages/Agenda";
import Profile from "./pages/Profile";
import BotConfig from "./pages/BotConfig";
import CompanySettings from "./pages/CompanySettings";
import Financial from "./pages/Financial";
import Documents from "./pages/Documents";
import Cases from "./pages/Cases";
import ProcessMonitoring from "./pages/ProcessMonitoring";
import Subscription from "./pages/Subscription";
import Commissions from "./pages/Commissions";
import FraudAlerts from "./pages/FraudAlerts";
import ExitoSchedules from "./pages/ExitoSchedules";
import LeadsHistory from "./pages/LeadsHistory";
import LegalAI from "./pages/LegalAI";
import LandingIA from "./pages/LandingIA";
import AppLayout from "./components/layout/AppLayout";
import ProfileCheck from "./pages/ProfileCheck";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/IA" element={<LandingIA />} />
            <Route path="/ia" element={<LandingIA />} />
            <Route path="/connect/:token" element={<ConnectWhatsApp />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/kanban" element={<Kanban />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/tracking" element={<TrackingLinks />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/client-users" element={<ClientUsers />} />
              <Route path="/access-management" element={<AccessManagement />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bot-config" element={<BotConfig />} />
              <Route path="/company-settings" element={<CompanySettings />} />
              <Route path="/financeiro" element={<Financial />} />
              <Route path="/documentos" element={<Documents />} />
              <Route path="/processos" element={<Cases />} />
              <Route path="/monitoramento" element={<ProcessMonitoring />} />
              <Route path="/assinatura" element={<Subscription />} />
              <Route path="/comissoes" element={<Commissions />} />
              <Route path="/fraudes" element={<FraudAlerts />} />
              <Route path="/agendamentos-exito" element={<ExitoSchedules />} />
              <Route path="/historico-leads" element={<LeadsHistory />} />
              <Route path="/ia-juridica" element={<LegalAI />} />
              <Route path="/perfil-check" element={<ProfileCheck />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

```

---

## Arquivo: src/components/companies/BotTestChat.tsx

```typescript
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, RotateCcw, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  parts?: string[];
}

interface BotTestChatProps {
  companyId: string;
}

export function BotTestChat({ companyId }: BotTestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        setLoading(false);
        return;
      }

      const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-bot-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ company_id: companyId, messages: apiMessages }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast.error(err.error || "Erro ao comunicar com o bot", {
          description: err.detail ? String(err.detail).slice(0, 300) : undefined,
        });
        setLoading(false);
        return;
      }

      const data = await resp.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply,
        parts: data.parts,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error("Erro de conexão");
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <Card className="border-border/50 flex flex-col" style={{ height: "600px" }}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-primary" />
            Ambiente de Teste
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleReset} title="Reiniciar conversa">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reiniciar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Simule uma conversa como se fosse um lead. O bot usará as configurações atuais salvas.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 overflow-hidden p-3 pt-0">
        {/* Chat messages */}
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-3 py-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bot className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">Envie uma mensagem para testar o bot</p>
                <p className="text-xs mt-1">Ex: "Olá, boa tarde!"</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className="space-y-1">
                    {msg.role === "assistant" && msg.parts && msg.parts.length > 1 ? (
                      msg.parts.map((part, j) => (
                        <div
                          key={j}
                          className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-foreground"
                        >
                          {part}
                        </div>
                      ))
                    ) : (
                      <div
                        className={`rounded-xl px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/60 text-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-xl bg-muted/60 px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2 pt-2 border-t border-border mt-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Digite como se fosse um lead..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

```

---

## Arquivo: supabase/functions/decision-engine/index.ts

```typescript
// Decision Engine — AdvOne
// Recebe { lead_id?, company_id, niche, case_type, answers }
// Retorna { score, classification, action, priority, reason, matched_rule_id }
// Se lead_id presente: persiste em lead_qualification_answers, atualiza leads.lead_score
// e move o card no Kanban conforme a action.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Condition = { field: string; op: string; value: any };
type Rule = {
  id: string;
  company_id: string | null;
  niche: string;
  case_type: string | null;
  rule_name: string;
  priority: number;
  conditions: Condition[];
  output: {
    score: number;
    classification: "quente" | "morno" | "frio" | "invalido";
    action: "agendar" | "continuar_qualificacao" | "pedir_documentos" | "transferir_humano" | "encerrar";
    priority: "alta" | "media" | "baixa";
    reason: string;
  };
};

function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function evalCondition(input: any, c: Condition): boolean {
  const v = getByPath(input, c.field);
  switch (c.op) {
    case "eq": return v === c.value;
    case "neq": return v !== c.value;
    case "in": return Array.isArray(c.value) && c.value.includes(v);
    case "not_in": return Array.isArray(c.value) && !c.value.includes(v);
    case "gt": return typeof v === "number" && v > c.value;
    case "gte": return typeof v === "number" && v >= c.value;
    case "lt": return typeof v === "number" && v < c.value;
    case "lte": return typeof v === "number" && v <= c.value;
    case "exists": return v !== undefined && v !== null && v !== "";
    default: return false;
  }
}

function ruleMatches(input: any, rule: Rule): boolean {
  const conds: any = rule.conditions;
  // Empty/null conditions = fallback rule (always matches)
  if (conds == null) return true;
  if (Array.isArray(conds)) {
    if (conds.length === 0) return true;
    return conds.every((c) => evalCondition(input, c));
  }
  // Object form: { question_key: value | [values] }, looked up in answers.{key}
  // Array value means "value must be in array" (in); scalar means "eq".
  if (typeof conds === "object") {
    const keys = Object.keys(conds);
    if (keys.length === 0) return true;
    return keys.every((k) => {
      const expected = conds[k];
      const actual = getByPath(input, `answers.${k}`);
      if (Array.isArray(expected)) return expected.includes(actual);
      return actual === expected;
    });
  }
  return false;
}

async function loadApplicableRules(
  supabase: any,
  companyId: string,
  niche: string,
  caseType: string | null,
): Promise<Rule[]> {
  // Override hierarchy: rules of the company override globals when matching same (niche, case_type, rule_name).
  const { data: overrides } = await supabase
    .from("decision_rules")
    .select("*")
    .eq("company_id", companyId)
    .eq("niche", niche)
    .eq("is_active", true);

  const { data: globals } = await supabase
    .from("decision_rules")
    .select("*")
    .is("company_id", null)
    .eq("niche", niche)
    .eq("is_active", true);

  const overrideKeys = new Set((overrides || []).map((r: Rule) => r.rule_name));
  const merged = [
    ...(overrides || []),
    ...((globals || []) as Rule[]).filter((r) => !overrideKeys.has(r.rule_name)),
  ] as Rule[];

  // Filter case_type: rule.case_type NULL means "applies to any case in the niche"
  const filtered = merged.filter((r) => !r.case_type || r.case_type === caseType);

  // Sort by priority asc (lower first), then specific case_type before generic
  filtered.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aSpec = a.case_type ? 0 : 1;
    const bSpec = b.case_type ? 0 : 1;
    return aSpec - bSpec;
  });

  return filtered;
}

function applyFinalGuards(input: any, decision: Rule["output"]): Rule["output"] {
  // Bloco de controle final: agendar exige classification=quente AND wants_help=sim
  if (decision.action === "agendar") {
    const wantsHelp = getByPath(input, "answers.wants_help");
    if (decision.classification !== "quente" || (wantsHelp !== undefined && wantsHelp !== "sim")) {
      return {
        ...decision,
        action: "continuar_qualificacao",
        reason: `${decision.reason} — agendamento bloqueado pelo controle final (classification!=quente ou wants_help!=sim)`,
      };
    }
  }
  return decision;
}

async function applyKanbanMove(supabase: any, leadId: string, companyId: string, action: string) {
  // Mapeia action → coluna do Kanban
  const targetMap: Record<string, { name?: string; flag?: "is_won" | "is_lost" }> = {
    agendar: { name: "Agendado" },
    encerrar: { flag: "is_lost" },
    continuar_qualificacao: { name: "1º Follow-UP" },
    pedir_documentos: { name: "1º Follow-UP" },
  };
  const target = targetMap[action];
  if (!target) return;

  let query = supabase.from("kanban_columns").select("id").eq("company_id", companyId).limit(1);
  if (target.name) query = query.ilike("name", target.name);
  if (target.flag === "is_lost") query = query.eq("is_lost", true);
  if (target.flag === "is_won") query = query.eq("is_won", true);

  const { data: col } = await query.maybeSingle();
  if (col?.id) {
    await supabase.from("leads").update({ kanban_column_id: col.id }).eq("id", leadId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceCall = token === serviceKey;

    // Se for chamada com service key (vinda de outra edge function como zapi-webhook),
    // pula a validação de usuário. Senão, valida o JWT.
    if (!isServiceCall) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { auth: { persistSession: false } },
      );
      const { data: { user }, error: authErr } = await supabaseUser.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { lead_id, company_id, niche, case_type, answers, dry_run } = body || {};

    if (!company_id || !niche || !answers || typeof answers !== "object") {
      return new Response(
        JSON.stringify({ error: "company_id, niche e answers são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const rules = await loadApplicableRules(admin, company_id, niche, case_type ?? null);

    const input = { niche, case_type, answers };
    let matched: Rule | null = null;
    for (const r of rules) {
      if (ruleMatches(input, r)) { matched = r; break; }
    }

    let decision: Rule["output"];
    let matchedRuleId: string | null = null;

    if (matched) {
      decision = applyFinalGuards(input, matched.output);
      matchedRuleId = matched.id;
    } else {
      // Sem nenhuma regra aplicável — fallback universal seguro
      decision = {
        score: 50,
        classification: "morno",
        action: "continuar_qualificacao",
        priority: "media",
        reason: "Nenhuma regra correspondeu — manter qualificação",
      };
    }

    const result = { ...decision, matched_rule_id: matchedRuleId };

    // Persistência opcional (só se vier lead_id e não for dry_run)
    if (lead_id && !dry_run) {
      await admin.from("lead_qualification_answers").insert({
        lead_id,
        company_id,
        niche,
        case_type: case_type ?? null,
        answers,
        decision_result: result,
        decided_at: new Date().toISOString(),
      });

      const scoreMap: Record<string, string> = {
        quente: "quente", morno: "morno", frio: "frio", invalido: "frio",
      };
      await admin.from("leads")
        .update({ lead_score: scoreMap[decision.classification] || "morno" })
        .eq("id", lead_id);

      await applyKanbanMove(admin, lead_id, company_id, decision.action);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("decision-engine error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

```

---

## Arquivo: supabase/functions/legal-ai-chat/index.ts

```typescript
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a Dra. Helena Vasconcellos, uma advogada brasileira sênior com mais de 30 anos de experiência prática em advocacia, doutora em Direito pela USP, com pós-doutorado em Direito Constitucional, Civil, Trabalhista, Previdenciário, Tributário e Processual.

ESPECIALIZAÇÕES:
- Redação de petições iniciais, contestações, recursos, embargos
- Mandado de Segurança (individual e coletivo)
- Habeas Corpus, Habeas Data, Ação Popular, Ação Civil Pública
- Contratos cíveis, empresariais, trabalhistas, locação, prestação de serviços, compra e venda
- Procurações, declarações, notificações extrajudiciais
- Pareceres jurídicos fundamentados
- Estratégia processual e teses jurídicas inovadoras

DIRETRIZES DE TRABALHO:
1. **Sempre cite a base legal**: leis, artigos, súmulas, jurisprudência (STF, STJ, TST, TJ, TRF) com referências reais e atualizadas conforme a legislação brasileira vigente.
2. **Estrutura formal completa**: ao redigir peças, use a estrutura técnica (endereçamento, qualificação, dos fatos, do direito, dos pedidos, valor da causa, requerimentos finais, local/data, assinatura).
3. **Linguagem jurídica precisa**: utilize a terminologia técnica adequada, sem populismo, mas mantenha a clareza.
4. **Antes de redigir**: se faltarem dados essenciais (nome das partes, CPF/CNPJ, valores, fatos específicos, comarca), pergunte de forma objetiva e numerada o que falta. Não invente fatos.
5. **Personalização**: adapte ao caso concreto que o advogado descrever, considerando a comarca, a vara competente e a legislação aplicável.
6. **Quando entregar uma peça/contrato**: deixe claros os marcadores [PREENCHER] para dados que precisam ser confirmados pelo advogado responsável.
7. **Ética**: nunca oriente a praticar atos ilegais, fraudulentos ou contrários ao Código de Ética da OAB.

FORMATAÇÃO:
- Use markdown (títulos, negrito, listas) para legibilidade.
- Para peças/contratos longos, formate com seções claras (I - DOS FATOS, II - DO DIREITO, etc.).
- Sempre encerre peças com lugar, data e linha de assinatura.

Aja como uma colega experiente respondendo a um(a) advogado(a). Seja direta, técnica e profunda.`;

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "LOVABLE_API_KEY não configurada" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsError } = await userClient.auth.getClaims(accessToken);
    if (claimsError || !claims?.claims?.sub) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { conversationId, companyId, messages, documentType } = body as {
      conversationId?: string;
      companyId: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      documentType?: string;
    };

    if (!companyId || !Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ error: "Parâmetros inválidos" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verifica acesso da empresa (bloqueia êxito)
    const { data: company, error: cErr } = await admin
      .from("companies")
      .select("id, partnership_type")
      .eq("id", companyId)
      .single();

    if (cErr || !company) {
      return jsonResponse({ error: "Empresa não encontrada" }, 404);
    }
    if (company.partnership_type !== "mensalidade_zionads") {
      return jsonResponse(
        { error: "A IA Jurídica está disponível apenas para clientes do plano mensal. Fale com seu gestor para liberar." },
        403
      );
    }

    // Garante conversa
    let convId = conversationId;
    const lastUser = messages[messages.length - 1];
    if (!convId) {
      const title = lastUser.content.slice(0, 80);
      const { data: newConv, error: nErr } = await admin
        .from("legal_ai_conversations")
        .insert({
          company_id: companyId,
          user_id: userId,
          title,
          document_type: documentType ?? null,
        })
        .select("id")
        .single();
      if (nErr || !newConv) {
        console.error("create conversation failed", nErr);
        return jsonResponse({ error: "Falha ao criar conversa" }, 500);
      }
      convId = newConv.id;
    } else {
      // Atualiza updated_at e document_type se vier
      await admin
        .from("legal_ai_conversations")
        .update({ updated_at: new Date().toISOString(), ...(documentType ? { document_type: documentType } : {}) })
        .eq("id", convId);
    }

    // Salva a mensagem do usuário
    await admin.from("legal_ai_messages").insert({
      conversation_id: convId,
      role: "user",
      content: lastUser.content,
      document_type: documentType ?? null,
    });

    // Chama Lovable AI com streaming
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return jsonResponse({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
      }
      if (aiResp.status === 402) {
        return jsonResponse({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }, 402);
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return jsonResponse({ error: "Erro no gateway de IA" }, 500);
    }

    // Tee o stream para repassar ao cliente E coletar texto para salvar
    const [browserStream, captureStream] = aiResp.body!.tee();

    // Processa em background para salvar a mensagem completa
    captureAndSave(captureStream, admin, convId!, documentType ?? null);

    // Devolve com cabeçalhos x- para o cliente saber o conversationId
    const headers = new Headers({
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "X-Conversation-Id": convId!,
    });
    return new Response(browserStream, { headers });
  } catch (e) {
    console.error("legal-ai-chat error:", e);
    return jsonResponse({ error: getErrorMessage(e, "Erro inesperado") }, 500);
  }
}

async function captureAndSave(
  stream: ReadableStream<Uint8Array>,
  admin: any,
  conversationId: string,
  documentType: string | null,
) {
  try {
    const reader = stream.getReader();
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
          if (c) assistantText += c;
        } catch {
          // ignore partial
        }
      }
    }

    if (assistantText.trim().length > 0) {
      // Heurística: se conteúdo longo ou começa com "EXCELENTÍSSIMO" ou "CONTRATO", marcar como documento
      const isDoc =
        documentType !== null ||
        assistantText.length > 1500 ||
        /^(EXCELENTÍSSIMO|EXCELENTISSIMO|CONTRATO|MANDADO|PROCURAÇÃO|PROCURACAO)/i.test(assistantText.trim());
      await admin.from("legal_ai_messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantText,
        document_type: documentType,
        is_document: isDoc,
      });
    }
  } catch (e) {
    console.error("captureAndSave error:", e);
  }
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Deno serve
Deno.serve(handler);

```

---

## Arquivo: supabase/functions/test-bot-chat/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { chatCompletion, getCompanyAIConfig } from "../_shared/aiClient.ts";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSDRPrompt(config: any) {
  const company = config.companies;
  const officeName = config.office_name || company?.name || "o escritório";
  const practiceArea = config.practice_area || "";
  const tone = config.communication_tone || "moderado";
  const botName = company?.bot_name || "Laura";
  const botRole = company?.bot_role_description || "atendente virtual";
  const consultationDuration = config.consultation_duration || "30 minutos";
  const targetAudience = config.target_audience || "";
  const customPrompt = config.ai_prompt || "";

  const cpfRegraOuro = `
═══════════════════════════════════════
🚫 REGRA DE OURO (MUITO IMPORTANTE)
═══════════════════════════════════════
NUNCA, JAMAIS, peça o CPF do cliente. Nem o RG. Peça apenas o NOME COMPLETO no final do agendamento. Se o cliente perguntar se precisa de CPF, diga que não é necessário agora. Esta regra é absoluta.
`;
  const triageOptions: any[] = Array.isArray(config.triage_options) ? config.triage_options : [];

  const toneInstructions = tone === "formal"
    ? "Use linguagem formal e tratamento respeitoso (Sr./Sra.). Mantenha cordialidade."
    : tone === "informal"
    ? "Use linguagem leve, descontraída e amigável. Use emojis com naturalidade 😊"
    : "Seja educado e profissional, mas acessível e acolhedor.";

  let triagemBlock = "";

  if (triageOptions.length > 0) {
    const menuItems = triageOptions.map((opt: any, i: number) => {
      const emoji = opt.emoji || `${i + 1}️⃣`;
      return `${emoji} ${opt.label}`;
    }).join("\n");

    const scripts = triageOptions.map((opt: any, i: number) => {
      const emoji = opt.emoji || `${i + 1}️⃣`;
      const questions = (opt.questions || []).filter((q: string) => q.trim()).map((q: string, qi: number) =>
        `  Pergunta ${qi + 1}: "${q}" — ESPERE a resposta antes de fazer a próxima pergunta`
      ).join("\n");
      const closing = opt.closing_message ? `  Encerramento: "${opt.closing_message}"` : `  Encerramento: "Vamos agendar uma análise do seu caso? Leva uns ${consultationDuration} 😊"`;
      const keywords = (opt.keyword_triggers || []).join(", ");
      return `📌 ASSUNTO ${i + 1} - ${opt.label}${keywords ? ` (detectar por: ${keywords})` : ""}:\n${questions}\n${closing}`;
    }).join("\n\n");

    triagemBlock = `
TRIAGEM INICIAL (na primeira mensagem do lead):
Após cumprimentar, envie o menu assim — em mensagens SEPARADAS:

Primeira mensagem: cumprimento + "Me conta, como posso te ajudar? 😊"

Segunda mensagem (separada): 
"Pra facilitar, me diz qual desses assuntos tem mais a ver com o seu caso:"

Terceira mensagem (separada — o menu):
${menuItems}

⚠️ REGRA CRÍTICA: Aguarde o lead responder ANTES de continuar. Nunca envie o menu + perguntas na mesma resposta.

SCRIPT POR ASSUNTO (após o lead escolher):

${scripts}

⚠️ REGRA DE OURO: Faça UMA ÚNICA pergunta por mensagem. Espere a resposta. Só então faça a próxima.
Nunca acumule 2 ou mais perguntas na mesma mensagem.

SE O LEAD NÃO SE ENCAIXAR:
- Pergunte mais detalhes com empatia: "Entendi... me conta um pouquinho mais sobre a sua situação?"
- Se não for da área: "Poxa, esse assunto foge um pouco da nossa área 😔 Mas te recomendo procurar [recurso adequado]. Boa sorte! 🤞"
`;
  }

  const hasTriagem = triageOptions.length > 0;

  return `${cpfRegraOuro}
Você é ${botName}, ${botRole} de ${officeName}${practiceArea ? `, especializado em ${practiceArea}` : ""}.

PERSONALIDADE:
- Você conversa como uma pessoa REAL no WhatsApp — simpática, empática e acolhedora
- Você demonstra interesse genuíno pelo problema do lead
- Você usa expressões naturais: "entendi", "poxa", "que bom", "olha", "vamos lá"
- Você NUNCA parece um robô ou um script automatizado
- ${toneInstructions}

🚨 REGRA MAIS IMPORTANTE — UMA PERGUNTA POR VEZ:
- Envie APENAS UMA pergunta ou ideia por mensagem
- ESPERE o lead responder antes de fazer a próxima pergunta
- NUNCA acumule múltiplas perguntas na mesma mensagem
- Se precisar fazer 3 perguntas, faça em 3 turnos de conversa diferentes
- Cada mensagem sua deve ter NO MÁXIMO 1-2 linhas curtas

FORMATO DAS MENSAGENS:
- Escreva como no WhatsApp: frases curtas e diretas
- Separe ideias diferentes com linha em branco (\\n\\n) — cada bloco vira uma mensagem separada
- Use emojis com naturalidade mas sem exagero (1-2 por mensagem no máximo)
- Varie as expressões — não repita "perfeito" ou "entendi" toda hora

OBJETIVO:
- Seu objetivo principal é qualificar o lead e conduzi-lo ao agendamento
- Você NÃO dá orientação jurídica vinculante (nunca diga "você tem direito" ou "vai ganhar a causa")
- MAS você PODE dar explicações conceituais curtas sobre termos jurídicos quando o lead perguntar — desde que siga a regra abaixo

🎓 QUANDO O LEAD PERGUNTAR ALGO JURÍDICO CONCEITUAL (ex: "o que é antecipação de tutela", "o que significa preclusão", "o que é RMC", andamento de processo, decisão judicial, termos técnicos):

⚠️ REGRA INVIOLÁVEL — ANTES DE EXPLICAR, PERGUNTE SE JÁ É CLIENTE:
1️⃣ Primeiro turno: valide a dúvida E pergunte se já é cliente, em UMA mensagem curta.
   Exemplo: "Boa pergunta! 😊\\n\\nAntes de te explicar direitinho, me conta: você já é cliente aqui de ${officeName}, ou tá entrando em contato pela primeira vez?"

2️⃣ Se JÁ É CLIENTE:
   - NÃO explique você mesma. Diga que vai transferir para a equipe responsável pelo caso.
   - "Entendi! 🙂\\n\\nComo já é cliente, vou pedir pra equipe responsável pelo seu processo te explicar com precisão o que isso significa no seu caso, tá?\\n\\nUm momento que já te encaminho 🙏"
   - Em seguida chame transfer_to_human com motivo "Cliente existente solicitando esclarecimento jurídico sobre o processo".

3️⃣ Se NÃO é cliente / primeira vez:
   - Dê uma explicação CURTA, didática, sem juridiquês (2-3 frases).
   - Exemplo "antecipação de tutela": "Antecipação de tutela é quando o juiz concede um pedido logo no começo do processo, antes da decisão final, geralmente em casos urgentes. Quando NÃO é concedida, o processo continua normalmente até a sentença final 🙂"
   - Em seguida conduza para o agendamento: "Mas cada caso tem detalhes próprios.\\n\\nSe quiser, o(a) Dr(a). pode analisar a sua situação numa conversa rápida e gratuita. Posso já marcar?"

4️⃣ Se não souber responder se é cliente: trate como NÃO cliente (item 3).

${targetAudience ? `PÚBLICO-ALVO: ${targetAudience}` : ""}

${customPrompt ? `INSTRUÇÕES DO ESCRITÓRIO:\n${customPrompt}` : ""}
${triagemBlock}
FLUXO NATURAL DA CONVERSA:

Turno 1: Cumprimente com calor humano + apresente-se brevemente
Turno 2: Pergunte "Me conta, o que tá acontecendo?" (NÃO peça o nome agora)
Turno 3+: Siga o script de qualificação — UMA pergunta por turno
Último: Conduza para agendamento. APÓS o lead aceitar o horário sugerido, peça o NOME COMPLETO.

🚫 REGRA ABSOLUTA: NUNCA peça o CPF ou RG. Peça apenas o NOME COMPLETO no final, após o agendamento ser aceito. Se o cliente perguntar se precisa de CPF, diga que não é necessário agora.

📆 DATA E HORA ATUAL: Hoje é ${new Date(getNowBrasilia()).toLocaleDateString("pt-BR", { weekday: "long" })}, ${getTodayBrasilia()} (${String(getNowBrasilia().getHours()).padStart(2,"0")}:${String(getNowBrasilia().getMinutes()).padStart(2,"0")} horário de Brasília). O ANO ATUAL É ${getNowBrasilia().getFullYear()}. NUNCA use anos passados ao agendar. Sempre OFEREÇA O PRIMEIRO HORÁRIO LIVRE retornado por check_availability — não invente horários. Se o lead não disser data, omita "date" em check_availability (o sistema usa o próximo dia útil).

⏰ HORÁRIO DE FUNCIONAMENTO (REGRA OBRIGATÓRIA):
- Agendamentos SOMENTE entre 08:00 e 17:00 (horário de Brasília)
- NUNCA sugira horários antes das 08:00 ou após as 17:00
- NUNCA mencione "início da noite" ou "noite" como opção — o escritório NÃO funciona à noite
- Se já for depois das 17:00, NÃO ofereça horários para hoje — ofereça para o próximo dia útil

🔒 CAPTURA OBRIGATÓRIA DE NOME COMPLETO (SOMENTE APÓS ACEITE DO HORÁRIO):
- APÓS o lead aceitar o horário sugerido, peça o NOME COMPLETO (mín. 3 palavras).
- Use tom cordial: "Perfeito! 🙂 Pra já deixar tudo certinho no nosso sistema antes de finalizar, você poderia gentilmente me informar seu *nome completo*, por favor?"
- Quando receber, chame register_client_name passando full_name e agradeça.
- 🚫 NUNCA PEÇA CPF.

📅 ABORDAGEM DE AGENDAMENTO (REGRA OBRIGATÓRIA):
- Quando for agendar, SEMPRE transmita URGÊNCIA e IMPORTÂNCIA: "Como o seu caso é urgente, podemos agendar já pra amanhã!"
- Pergunte a preferência de turno: "Você prefere na parte da manhã ou da tarde?"
- Depois use check_availability para buscar horários reais
- Ofereça SEMPRE 2 opções concretas: UMA de manhã (entre 08:00 e 12:00) e UMA à tarde (entre 13:00 e 17:00).
- Formato: "Tenho esses horários pra você:\\n\\n📅 Manhã: [dia], dia [DD/MM] às [HH:MM]\\n📅 Tarde: [dia], dia [DD/MM] às [HH:MM]\\n\\nQual fica melhor pra você? 😊"
- Se o lead solicitar um horário específico que não foi oferecido, RESPEITE a escolha dele agendando no horário que ele falar ou no horário mais próximo disponível caso o escolhido esteja ocupado.
- IMPORTANTE: SEMPRE use datas no formato DD/MM/YYYY (ex: 16/04/2026). NUNCA use formato YYYY-MM-DD.
- Se só houver horários em um turno, ofereça 2 opções desse turno.
- Quando o lead escolher, use "schedule_appointment" para confirmar.
- Após confirmar, envie: "Pronto, agendado! ✅ [detalhes]"
- NUNCA invente horários sem antes consultar a disponibilidade
- FUSO HORÁRIO: Todos os horários são no horário de Brasília (BRT)

QUANDO O LEAD RESISTIR:
"Entendo! Mas olha, é totalmente gratuito e sem compromisso 😊 Leva menos de ${consultationDuration} e o(a) Dr(a). vai analisar pessoalmente se você tem direito."

QUALIFICAÇÃO (ferramentas disponíveis):
- "check_availability": SEMPRE use antes de sugerir horários
- "schedule_appointment": Use APÓS o lead escolher um horário
- "qualify_lead": Use quando souber o suficiente sobre o caso
- "transfer_to_human": Quando necessário

IMPORTANTE: Este é um MODO DE TESTE. As ferramentas retornam dados reais da agenda, mas agendamentos NÃO são criados de verdade.

Responda SEMPRE em português do Brasil.`;
}

function getNowBrasilia(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "0";
  let h = Number(get("hour"));
  if (h === 24) h = 0;
  return new Date(
    Number(get("year")), Number(get("month")) - 1, Number(get("day")),
    h, Number(get("minute")), Number(get("second"))
  );
}

function getTodayBrasilia(): string {
  const b = getNowBrasilia();
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`;
}

async function getAvailableSlots(supabase: any, companyId: string, dateStr: string) {
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const date = new Date(dateStr + "T12:00:00Z");
  const dayOfWeek = date.getUTCDay();
  const dayKey = dayKeys[dayOfWeek];
  const dayName = dayNames[dayOfWeek];

  const { data: company } = await supabase
    .from("companies")
    .select("business_hours")
    .eq("id", companyId)
    .single();

  const businessHours: any = company?.business_hours || {};
  let slots: string[] = [];

  const dayConfig = businessHours[dayKey];
  
  if (Array.isArray(dayConfig) && dayConfig.length > 0) {
    for (const shift of dayConfig) {
      const start = shift.open || shift.start;
      const end = shift.close || shift.end;
      if (!start || !end) continue;
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      for (let m = startMin; m < endMin; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
  } else if (dayConfig && typeof dayConfig === "object" && dayConfig.enabled !== false) {
    const shifts = dayConfig.shifts || [];
    for (const shift of shifts) {
      const start = shift.open || shift.start;
      const end = shift.close || shift.end;
      if (!start || !end) continue;
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      for (let m = startMin; m < endMin; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
  }

  const hasAnyConfig = Object.keys(businessHours).length > 0;
  if (slots.length === 0 && !hasAnyConfig && dayOfWeek >= 1 && dayOfWeek <= 5) {
    for (let h = 8; h < 12; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
    for (let h = 13; h < 17; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
  }

  slots = slots.filter(s => {
    const [h, m] = s.split(":").map(Number);
    const mins = h * 60 + m;
    return mins >= 480 && mins < 1020;
  });

  const todayBR = getTodayBrasilia();
  if (dateStr === todayBR) {
    const nowBR = getNowBrasilia();
    const minMinutes = (nowBR.getHours() * 60 + nowBR.getMinutes()) + 120;
    slots = slots.filter(s => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m >= minMinutes;
    });
  }

  const nextDay = new Date(new Date(dateStr + "T12:00:00Z").getTime() + 86400000).toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("lead_reminders")
    .select("due_at")
    .eq("company_id", companyId)
    .gte("due_at", dateStr + "T03:00:00Z")
    .lt("due_at", nextDay + "T03:00:00Z")
    .eq("completed", false);

  const bookedTimes = new Set(
    (existing || []).map((r: any) => {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      return fmt.format(new Date(r.due_at));
    })
  );

  return { date: formatDateDMY(dateStr), dayName, slots: slots.filter(s => !bookedTimes.has(s)) };
}

function formatDateDMY(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function isValidFullName(raw: string): boolean {
  if (!raw) return false;
  const parts = String(raw).trim().split(/\s+/).filter(p => p.length >= 2 && /^[A-Za-zÀ-ÿ'-]+$/.test(p));
  return parts.length >= 3;
}

function isValidCPF(cpf: string): boolean {
  const str = String(cpf).replace(/\D/g, "");
  if (str.length !== 11 || /^(\d)\1{10}$/.test(str)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(str.charAt(i)) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(str.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(str.charAt(i)) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(str.charAt(10))) return false;
  return true;
}

function getNextAvailableDays(count: number, includeToday: boolean = true): string[] {
  const days: string[] = [];
  const nowBR = getNowBrasilia();
  let d = includeToday ? new Date(nowBR) : new Date(nowBR.getTime() + 86400000);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    d = new Date(d.getTime() + 86400000);
  }
  return days;
}

function sanitizeDate(rawDate: string | undefined | null): string {
  const fallback = getNextAvailableDays(1, false)[0];
  if (!rawDate) return fallback;
  let s = String(rawDate).trim();
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) s = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const [y, m, d] = s.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  if (isNaN(parsed.getTime())) return fallback;
  const nowBR = getNowBrasilia();
  const todayMid = new Date(nowBR.getFullYear(), nowBR.getMonth(), nowBR.getDate()).getTime();
  const oneYearAhead = todayMid + 365 * 86400000;
  if (parsed.getTime() < todayMid || parsed.getTime() > oneYearAhead) return fallback;
  return s;
}

function splitIntoNaturalMessages(text: string): string[] {
  if (!text || text.length <= 120) return [text];
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const messages: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= 150) { messages.push(para); continue; }
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((l) => l.length <= 150)) { messages.push(...lines); continue; }
    const sentences = para.match(/[^.!?]+[.!?]+[\s]*/g) || [para];
    let currentChunk = "";
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 150 && currentChunk) {
        messages.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) messages.push(currentChunk.trim());
  }
  return messages.filter(Boolean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, messages } = await req.json();
    if (!company_id || !messages) {
      return new Response(JSON.stringify({ error: "company_id e messages são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: config } = await adminClient
      .from("whatsapp_configs")
      .select(`
        *,
        companies (name, bot_name, bot_role_description)
      `)
      .eq("company_id", company_id)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Configuração do bot não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiConfig = await getCompanyAIConfig(company_id);
    const forceProvider = aiConfig.use_openai_for_testing ? "openai" as const : undefined;

    let systemPrompt = buildSDRPrompt(config);
    if (aiConfig.custom_system_prompt) {
      systemPrompt += `\n\n--- INSTRUÇÕES ADICIONAIS DO ESCRITÓRIO ---\n${aiConfig.custom_system_prompt}`;
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "register_client_name",
          description: "Registra o nome completo do lead no sistema. Use apenas APÓS o lead aceitar o agendamento.",
          parameters: {
            type: "object",
            properties: {
              full_name: { type: "string", description: "Nome COMPLETO (mínimo 3 palavras: nome + sobrenomes)" }
            },
            required: ["full_name"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Verifica horários disponíveis.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "Data no formato YYYY-MM-DD" }
            },
            required: ["date"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "schedule_appointment",
          description: "Agenda uma consulta. Use SOMENTE APÓS register_client_name + lead escolher horário.",
          parameters: {
            type: "object",
            properties: {
              message_to_lead: { type: "string" },
              date: { type: "string" },
              time: { type: "string" },
              summary: { type: "string" },
              modality: { type: "string", enum: ["presencial", "online"] },
              unit: { type: "string" }
            },
            required: ["message_to_lead", "date", "time"],
            additionalProperties: false
          }
        }
      }
    ];

    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let reply = "";
    let toolActions: any[] = [];
    let cpfRegistered = "";
    let maxIterations = 3;

    while (maxIterations > 0) {
      maxIterations--;

      let aiData: any;
      try {
        aiData = await chatCompletion({
          companyId: company_id,
          forceProvider,
          messages: aiMessages,
          tools,
          fallbackModel: "google/gemini-2.5-flash-lite",
        });
      } catch (e) {
        const msg = getErrorMessage(e);
        console.error("AI error:", msg);
        // Detecta status code embutido na mensagem (formato "AI lovable 429: ...")
        const statusMatch = msg.match(/\b(\d{3})\b/);
        const status = statusMatch ? Number(statusMatch[1]) : 500;
        let userMsg = "Erro ao processar resposta da IA";
        if (status === 429) userMsg = "Limite de requisições atingido. Aguarde alguns segundos e tente novamente.";
        else if (status === 402) userMsg = "Créditos da IA esgotados. Adicione créditos no workspace para continuar.";
        return new Response(JSON.stringify({ error: userMsg, detail: msg }), {
          status: status === 429 || status === 402 ? status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = aiData.choices?.[0]?.message;
      if (!message) break;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        reply = message.content || "Sem resposta da IA";
        break;
      }

      aiMessages.push(message);

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let args: any = {};
        try { args = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* */ }

        let toolResult: any = {};

        if (fnName === "register_client_name") {
          const fullName = String(args.full_name || "").trim();
          const nameOk = isValidFullName(fullName);
          if (!nameOk) {
            toolResult = { success: false, error: "Nome incompleto. Peça nome COMPLETO com sobrenomes (≥3 palavras)." };
          } else {
            cpfRegistered = "NAME_REGISTERED"; // Reusing the variable to track name instead of CPF
            toolResult = { success: true, full_name: fullName, message: "[TESTE] Nome completo registrado. Já pode agendar." };
          }
          toolActions.push({ tool: "register_client_name", result: toolResult });
        }

        if (fnName === "check_availability") {
          const dateToCheck = sanitizeDate(args.date);
          const availability = await getAvailableSlots(adminClient, company_id, dateToCheck);
          toolResult = {
            date: availability.date,
            day_name: availability.dayName,
            slots: availability.slots,
            instruction: `Ofereça estes horários ao lead: ${availability.slots.slice(0, 5).join(", ")}...`,
          };
          toolActions.push({ tool: "check_availability", result: toolResult });
        }

        if (fnName === "schedule_appointment") {
          if (!cpfRegistered) {
            toolResult = { success: false, error: "NAME_REQUIRED", message: "[TESTE] Bloqueado: registre o nome completo do cliente primeiro via register_client_name." };
          } else {
            reply = args.message_to_lead || reply;
            toolResult = { success: true, message: "[TESTE] Agendamento simulado com sucesso", date: sanitizeDate(args.date), time: args.time, modality: args.modality || "online", unit: args.unit || "", cpf: cpfRegistered };
          }
          toolActions.push({ tool: "schedule_appointment", result: toolResult });
        }

        aiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    const parts = splitIntoNaturalMessages(reply);

    return new Response(JSON.stringify({
      reply,
      parts,
      tool_actions: toolActions,
      ai_provider: forceProvider ?? aiConfig.provider,
      ai_model: aiConfig.model,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("test-bot-chat error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

```

---

## Arquivo: supabase/functions/zapi-webhook/index.ts

```typescript
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ====== PROMPT BUILDERS ======
function buildSDRPrompt(
  config: any,
  leadName: string | undefined,
  offices: any[] = [],
  flowsBlock: string = "",
  triageBlock: string = "",
): string {
  const company = config.companies;
  const officeName = config.office_name || company?.name || "o escritório";
  const practiceArea = config.practice_area || "";
  const tone = config.communication_tone || "moderado";
  const customPrompt = (config.ai_prompt || "").trim();
  const botName = company?.bot_name || "Laura";
  const botRole = company?.bot_role_description || "atendente virtual";

  // Se o prompt customizado começar com "Você é", assumimos que é o prompt completo
  // gerado pelo construtor dinâmico — mas ainda injetamos fluxos e triage ao final.
  if (customPrompt.startsWith("Você é")) {
    const extras = [
      flowsBlock
        ? `\n\n═══════════════════════════════════════\nFLUXOS ATIVOS DESTE ESCRITÓRIO\n═══════════════════════════════════════\n${flowsBlock}`
        : "",
      triageBlock
        ? `\n\n═══════════════════════════════════════\nCRITÉRIOS DE QUALIFICAÇÃO\n═══════════════════════════════════════\n${triageBlock}`
        : "",
    ].join("");
    return customPrompt + extras;
  }

  // 🏢 Endereços DINÂMICOS — sem endereço cadastrado = SOMENTE online
  const activeOffices = (offices || []).filter((o: any) => o && o.is_active !== false);
  const officesCount = activeOffices.length;
  const hasOffices = officesCount > 0;

  let modalidadeBlock: string;
  if (!hasOffices) {
    modalidadeBlock =
      "🟢 MODALIDADE — SOMENTE ONLINE (este escritório NÃO possui endereço cadastrado, atendimento é 100% online):\n" +
      "• REGRA CRÍTICA: Você NÃO atende presencial. NÃO pergunte se o lead prefere online ou presencial.\n" +
      "• REGRA CRÍTICA: NÃO ofereça atendimento presencial em hipótese alguma.\n" +
      '• Apenas confirme: "Como o nosso atendimento para o seu caso é 100% online (por videochamada), podemos seguir com o agendamento? 🙂" e, após o "sim", pergunte o horário.\n' +
      '• Em schedule_appointment use sempre modality="online" e unit="Online".';
  } else if (officesCount === 1) {
    const only = activeOffices[0];
    const enderecoLinhas = [
      `*${only.name}*`,
      `📍 ${only.address}`,
      only.complement ? `🏢 ${only.complement}` : null,
      only.reference_point ? `🗺️ ${only.reference_point}` : null,
      only.maps_url ? `🔗 ${only.maps_url}` : null,
    ].filter(Boolean).join("\n");
    modalidadeBlock =
      "🟢 MODALIDADE — pergunte UMA vez só (este escritório atende online E presencial):\n" +
      '"Você prefere que essa conversa seja online (por videochamada) ou presencial aqui no escritório? 🙂"\n' +
      "• Se ONLINE: confirme e siga pro horário.\n" +
      `• Se PRESENCIAL: envie em mensagem separada o endereço da unidade:\n"Perfeito! 🙂 Nosso escritório fica aqui:\n\n${enderecoLinhas}"\n` +
      "• NUNCA invente outro endereço. Use SÓ esse.\n" +
      `• Em schedule_appointment use modality="online"|"presencial" e unit="${only.name}" ou "Online".`;
  } else {
    const lista = activeOffices
      .map((o: any, i: number) => `${i + 1}️⃣ *${o.name}* — 📍 ${o.address}`)
      .join("\n");
    const unitNames = activeOffices.map((o: any) => `"${o.name}"`).join(" OU ");
    modalidadeBlock =
      "🟢 MODALIDADE — pergunte UMA vez só (este escritório atende online E presencial):\n" +
      '"Você prefere que essa conversa seja online (por videochamada) ou presencial em uma das nossas unidades? 🙂"\n' +
      "• Se ONLINE: confirme e siga pro horário.\n" +
      `• Se PRESENCIAL, pergunte qual unidade fica melhor:\n"Temos ${officesCount} unidades, qual fica melhor pra você?\n\n${lista}"\n` +
      "• Use SÓ as unidades acima. NUNCA invente endereço.\n" +
      `• Em schedule_appointment use modality="online"|"presencial" e unit=${unitNames} ou "Online".`;
  }

  const leadNameInfo = leadName
    ? `\n\nNOME DO LEAD: O nome do lead é "${leadName}". Use esse nome quando se referir a ele.\n`
    : "\n\nNOME DO LEAD: Você ainda não sabe o nome. Peça o NOME COMPLETO apenas no final do agendamento, após o lead aceitar um horário.\n";

  const toneInstructions = tone === "formal"
    ? "Use linguagem cordial e respeitosa."
    : tone === "informal"
    ? "Use linguagem leve e amigável com emojis 😊"
    : "Seja educada, próxima e acolhedora.";

  const nowBR = getNowBrasilia();
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const todayDayName = dayNames[nowBR.getDay()];
  const todayDMY = `${String(nowBR.getDate()).padStart(2, "0")}/${String(nowBR.getMonth() + 1).padStart(2, "0")}/${nowBR.getFullYear()}`;

  const flowsSection = flowsBlock
    ? `\n\n═══════════════════════════════════════\nFLUXOS ATIVOS — SIGA FIELMENTE\n═══════════════════════════════════════\nATENÇÃO: Se houver instruções específicas de fluxos abaixo, siga-as fielmente, inclusive se elas solicitarem o uso de opções ou menus numerados.\n\n${flowsBlock}`
    : "";

  const triageSection = triageBlock
    ? `\n\n═══════════════════════════════════════\nCRITÉRIOS DE QUALIFICAÇÃO\n═══════════════════════════════════════\n${triageBlock}`
    : "";

  const customSection = customPrompt
    ? `\n\n═══════════════════════════════════════\nINSTRUÇÕES ADICIONAIS DESTE ESCRITÓRIO\n═══════════════════════════════════════\n${customPrompt}\n`
    : "";

  return `Você é ${botName}, ${botRole} da equipe ${officeName}${practiceArea ? `, especializada no atendimento inicial de casos ${practiceArea}` : ""}.

═══════════════════════════════════════
🚫 REGRA DE OURO (PRIORIDADE ABSOLUTA)
═══════════════════════════════════════
NUNCA, em hipótese alguma, peça o CPF do cliente. Também não peça RG. Peça apenas o NOME COMPLETO no final do agendamento. Se o cliente perguntar se precisa de CPF, diga que não é necessário agora. Esta regra é inviolável.

═══════════════════════════════════════
IDENTIDADE E TOM
═══════════════════════════════════════
- Nome: ${botName}
- Nunca diga que é IA ou robô
- Papel: ${botRole} humanizada, acolhedora, paciente e objetiva
- Linguagem: simples, próxima, sem juridiquês, frases curtas
- Emojis leves: 🙂 😊
- Regra de ouro: UMA pergunta por vez
- Nunca dê parecer jurídico definitivo
- Seu papel não é resolver tudo no chat; seu papel é qualificar, gerar confiança e conduzir para o próximo passo
- ${toneInstructions}

📅 HOJE: ${todayDayName}, ${todayDMY} (${String(nowBR.getHours()).padStart(2, "0")}:${String(nowBR.getMinutes()).padStart(2, "0")} BRT). O ANO ATUAL É ${nowBR.getFullYear()}. NUNCA use anos passados (ex: 2023, 2024, 2025) ao agendar — sempre use ${nowBR.getFullYear()} ou o próximo se já virou o ano. Se o lead não disser data, NÃO chute: passe apenas o turno para check_availability omitindo o campo "date" (o sistema usa o próximo dia útil automaticamente). Sempre OFEREÇA O PRIMEIRO HORÁRIO LIVRE retornado por check_availability — não invente horários.
${leadNameInfo}

═══════════════════════════════════════
🎯 SUA MISSÃO: MÁXIMO 5 PERGUNTAS
═══════════════════════════════════════
Sua missão é entender o caso e AGENDAR uma conversa. Você deve perguntar o NOME do lead (se não souber) e fazer no MÁXIMO 5 perguntas totais de qualificação. Se o caso estiver dentro do perfil, convide IMEDIATAMENTE para a reunião.

═══════════════════════════════════════
🚫 REGRAS INVIOLÁVEIS (PRIORIDADE MÁXIMA)
═══════════════════════════════════════
1. 🚫 NUNCA peça CPF para o lead. Esta é a regra mais importante. Se você pedir CPF, você falhou em sua missão.
2. 🚫 NUNCA peça RG ou senha do Meu INSS.
3. 🚫 NUNCA tire dúvidas técnicas. Responda: "Essa parte o(a) advogado(a) te explica com segurança 🙂 Posso te encaixar numa conversa rápida?"
4. 🚫 MÁXIMO 5 PERGUNTAS totais para chegar no convite da reunião.
5. 🚫 Se perguntarem sobre VALORES: "Essa nossa primeira conversa é TOTALMENTE GRATUITA para entender o seu caso. Valores de honorários são tratados somente com os advogados, mas o foco agora é resolver seu problema."

═══════════════════════════════════════
📋 FLUXO OBRIGATÓRIO (PROIBIDO PEDIR CPF)
═══════════════════════════════════════
PASSO 1 — Saudação:
"Oi! Tudo bem? 😊 Eu sou a ${botName}, aqui da equipe ${officeName}. Pode ficar tranquilo(a), me conta o que aconteceu que eu vou te ajudar a entender melhor o seu caso 🙂"

PASSO 2 — (Removido: o nome será solicitado apenas no final)
"Entendi... me conta mais sobre o que aconteceu?" (Use se o lead ainda não tiver detalhado o caso).

PASSO 3 — Qualificação (Máximo 3-4 perguntas aqui):
Faça apenas as perguntas essenciais para entender se o caso é viável. UMA por vez.

PASSO 4 — Convite para Reunião (TOTALMENTE GRATUITA):
"Pelo que você me contou, faz total sentido você conversar rapidinho com o(a) advogado(a). Essa primeira conversa é TOTALMENTE GRATUITA. Posso já te encaixar?"

PASSO 5 — Modalidade:
${modalidadeBlock}

PASSO 6 — Horário e Dados Finais (NOME COMPLETO):
1. Pergunte o turno: "Qual horário é melhor pra você... manhã, tarde ou final do dia?"
2. Use check_availability para o turno escolhido.
3. Ofereça SEMPRE 2 opções: UMA na parte da manhã e UMA na parte da tarde.
4. Se o lead quiser outro horário específico, respeite a escolha dele agendando no horário solicitado ou no mais próximo disponível.
5. Ofereça horários específicos: "Tenho esses horários:\\n📅 Manhã: [dia] às [HH:MM]\\n📅 Tarde: [dia] às [HH:MM]\\n\\nQual fica melhor? 😊"
6. APÓS o lead aceitar o horário, peça o dado final: "Perfeito 🙂 Pra já deixar tudo organizado aqui pra equipe, me passa o seu *nome completo*, por favor?"
5. 🚫 REGRA ABSOLUTA: NÃO PEÇA CPF OU RG EM NENHUMA HIPÓTESE.
6. SÓ chame register_client_name e schedule_appointment APÓS o lead informar o nome completo.

${flowsSection}${triageSection}${customSection}

Responda SEMPRE em português do Brasil.`;
}

function buildDocumentCollectorPrompt(agentConfig: any, config: any, leadName?: string, requiredDocs?: any[]) {
  const officeName = config.office_name || "o escritório";
  const tone = config.communication_tone || "moderado";
  const toneInstructions = tone === "formal"
    ? "Use linguagem formal e tratamento respeitoso (Sr./Sra.)."
    : tone === "informal"
    ? "Use linguagem leve e amigável com emojis 😊"
    : "Seja educado e profissional, mas acessível.";

  const docs = requiredDocs && requiredDocs.length > 0
    ? requiredDocs.map((d: any) => `• ${d.name}${d.description ? ` (${d.description})` : ""}${d.required ? " ⚠️ obrigatório" : " (opcional)"}`).join("\n")
    : "• Documento com foto (RG ou CNH)\n• Comprovante de endereço\n• Documentos do caso (laudos, negativas, etc.)";

  const customPrompt = agentConfig?.prompt || "";

  return `Você é a assistente virtual de ${officeName}, responsável por COLETAR DOCUMENTOS do cliente.

${leadName ? `NOME DO CLIENTE: ${leadName}` : "Pergunte o nome se não souber."}

${toneInstructions}

OBJETIVO: Solicitar e receber os documentos necessários para análise do caso.

DOCUMENTOS NECESSÁRIOS:
${docs}

${customPrompt ? `INSTRUÇÕES ADICIONAIS:\n${customPrompt}\n` : ""}

FLUXO:
1. Cumprimente o cliente pelo nome e explique que precisa de alguns documentos
2. Liste os documentos necessários de forma clara e amigável
3. Quando o cliente enviar um documento/foto, use a ferramenta "register_document" para registrar
4. Confirme cada documento recebido com uma mensagem positiva
5. Quando todos os documentos obrigatórios forem recebidos, use "documents_complete" para avançar
6. Se o cliente tiver dúvida sobre algum documento, explique com paciência

REGRAS:
- UMA solicitação por mensagem
- Seja paciente se o cliente demorar
- Aceite fotos de documentos normalmente
- Quando o cliente enviar mídia/foto, registre como documento recebido
- Não peça todos os documentos de uma vez — vá pedindo um por um

Responda SEMPRE em português do Brasil.`;
}

function buildViabilityAnalyzerPrompt(agentConfig: any, config: any, leadName?: string, caseData?: any) {
  const officeName = config.office_name || "o escritório";
  const customPrompt = agentConfig?.prompt || "";

  return `Você é o assistente de análise de viabilidade de ${officeName}.

${leadName ? `CLIENTE: ${leadName}` : ""}

OBJETIVO: Analisar os dados e documentos do caso e fornecer um parecer de viabilidade.

${caseData ? `DADOS DO CASO:\n${JSON.stringify(caseData, null, 2)}\n` : ""}

${customPrompt ? `INSTRUÇÕES ADICIONAIS:\n${customPrompt}\n` : ""}

FLUXO:
1. Analise os documentos e informações disponíveis
2. Faça perguntas adicionais se necessário (UMA por vez)
3. Quando tiver informações suficientes, use "analyze_viability" para registrar o resultado
4. Comunique o resultado ao cliente de forma empática e clara
5. Se viável, use "advance_to_contract" para avançar ao fechamento

REGRAS:
- Seja objetivo mas empático
- NÃO dê parecer jurídico definitivo — diga "com base nos dados iniciais"
- Sempre recomende a análise final pelo advogado
- Classifique como: "viavel" (boas chances), "parcialmente_viavel" (precisa análise), "inviavel" (sem base legal clara)

Responda SEMPRE em português do Brasil.`;
}

function buildContractCloserPrompt(agentConfig: any, config: any, leadName?: string, viabilityResult?: any) {
  const officeName = config.office_name || "o escritório";
  const contractTemplate = agentConfig?.contract_template || "";
  const customPrompt = agentConfig?.prompt || "";

  return `Você é o assistente de fechamento de contrato de ${officeName}.

${leadName ? `CLIENTE: ${leadName}` : ""}

OBJETIVO: Conduzir o cliente ao fechamento do contrato de forma natural e confiante.

${viabilityResult ? `RESULTADO DA ANÁLISE:\n${JSON.stringify(viabilityResult, null, 2)}\n` : ""}

${contractTemplate ? `MODELO DE CONTRATO (referência):\n${contractTemplate}\n` : ""}

${customPrompt ? `INSTRUÇÕES ADICIONAIS:\n${customPrompt}\n` : ""}

FLUXO:
1. Recapitule o caso e o resultado da análise com empatia
2. Apresente os próximos passos para formalização
3. Explique os termos do contrato de forma simples
4. Confirme dados do cliente (nome completo, endereço)
5. Quando o cliente confirmar, use "finalize_contract" para registrar
6. Após fechar, envie mensagem de boas-vindas como cliente

REGRAS:
- Transmita segurança e profissionalismo
- Não pressione — conduza naturalmente
- Tire dúvidas sobre honorários e procedimentos
- UMA pergunta por mensagem

Responda SEMPRE em português do Brasil.`;
}

// ====== UTILITY FUNCTIONS ======
function getNowBrasilia(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "0";
  const y = Number(get("year"));
  const mo = Number(get("month"));
  const d = Number(get("day"));
  let h = Number(get("hour"));
  if (h === 24) h = 0;
  const mi = Number(get("minute"));
  const s = Number(get("second"));
  return new Date(y, mo - 1, d, h, mi, s);
}

function getTodayBrasilia(): string {
  const b = getNowBrasilia();
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`;
}

async function getAvailableSlots(supabase: any, companyId: string, dateStr: string): Promise<{ date: string; dayName: string; slots: string[] }> {
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const date = new Date(dateStr + "T12:00:00Z");
  const dayOfWeek = date.getUTCDay();
  const dayKey = dayKeys[dayOfWeek];
  const dayName = dayNames[dayOfWeek];

  const { data: company } = await supabase
    .from("companies")
    .select("business_hours")
    .eq("id", companyId)
    .single();

  const businessHours: any = company?.business_hours || {};
  let slots: string[] = [];

  const dayConfig = businessHours[dayKey];

  if (Array.isArray(dayConfig) && dayConfig.length > 0) {
    for (const shift of dayConfig) {
      const start = shift.open || shift.start;
      const end = shift.close || shift.end;
      if (!start || !end) continue;
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      for (let m = startMin; m < endMin; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
  } else if (dayConfig && typeof dayConfig === "object" && dayConfig.enabled !== false) {
    const shifts = dayConfig.shifts || [];
    for (const shift of shifts) {
      const start = shift.open || shift.start;
      const end = shift.close || shift.end;
      if (!start || !end) continue;
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      for (let m = startMin; m < endMin; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
  }

  const hasAnyConfig = Object.keys(businessHours).length > 0;
  if (slots.length === 0 && !hasAnyConfig && dayOfWeek >= 1 && dayOfWeek <= 5) {
    for (let h = 8; h < 12; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
    for (let h = 13; h < 17; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
  }

  slots = slots.filter(s => {
    const [h, m] = s.split(":").map(Number);
    const mins = h * 60 + m;
    return mins >= 480 && mins < 1020;
  });

  const todayBR = getTodayBrasilia();
  if (dateStr === todayBR) {
    const nowBR = getNowBrasilia();
    const minMinutes = (nowBR.getHours() * 60 + nowBR.getMinutes()) + 120;
    slots = slots.filter(s => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m >= minMinutes;
    });
  }

  const nextDay = new Date(new Date(dateStr + "T12:00:00Z").getTime() + 86400000).toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("lead_reminders")
    .select("due_at")
    .eq("company_id", companyId)
    .gte("due_at", dateStr + "T03:00:00Z")
    .lt("due_at", nextDay + "T03:00:00Z")
    .eq("completed", false);

  const bookedTimes = new Set(
    (existing || []).map((r: any) => {
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      return fmt.format(new Date(r.due_at));
    })
  );

  return { date: formatDateDMY(dateStr), dayName, slots: slots.filter(s => !bookedTimes.has(s)) };
}

function formatDateDMY(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function getNextAvailableDays(count: number, includeToday: boolean = true): string[] {
  const days: string[] = [];
  const nowBR = getNowBrasilia();
  let d = includeToday ? new Date(nowBR) : new Date(nowBR.getTime() + 86400000);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    d = new Date(d.getTime() + 86400000);
  }
  return days;
}

/**
 * Sanitiza data passada pela IA: se vier no passado, num ano errado, ou inválida,
 * substitui pelo próximo dia útil. Aceita YYYY-MM-DD ou DD/MM/YYYY.
 */
function sanitizeDate(rawDate: string | undefined | null): string {
  const fallback = getNextAvailableDays(1, false)[0];
  if (!rawDate) return fallback;
  let s = String(rawDate).trim();
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) s = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const [y, m, d] = s.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  if (isNaN(parsed.getTime())) return fallback;
  const nowBR = getNowBrasilia();
  const todayMid = new Date(nowBR.getFullYear(), nowBR.getMonth(), nowBR.getDate()).getTime();
  const oneYearAhead = todayMid + 365 * 86400000;
  const parsedMid = parsed.getTime();
  if (parsedMid < todayMid || parsedMid > oneYearAhead) return fallback;
  return s;
}

// ====== VALIDATORS ======
function isValidFullName(raw: string): boolean {
  if (!raw) return false;
  const parts = String(raw).trim().split(/\s+/).filter(p => p.length >= 2 && /^[A-Za-zÀ-ÿ'-]+$/.test(p));
  return parts.length >= 3;
}

// ====== SDR TOOLS ======
const sdrTools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Verifica o PRIMEIRO horário disponível na agenda para a data e turno informados. SEMPRE use antes de sugerir horário ao lead. Retorna apenas 1 sugestão (first_available_slot). Só use APÓS o lead ter indicado o turno (manhã/tarde/qualquer).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data no formato YYYY-MM-DD" },
          period: { type: "string", enum: ["manha", "tarde", "qualquer"], description: "Turno preferido pelo lead. 'manha' = 08:00-11:59, 'tarde' = 12:00-17:00, 'qualquer' = primeiro do dia." }
        },
        required: ["date"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "decide_lead",
      description: "Chama o Decision Engine do AdvOne para classificar o lead (score/quente-morno-frio) e decidir a próxima ação (agendar, continuar_qualificacao, pedir_documentos, transferir_humano, encerrar) com base nas respostas estruturadas. Use após coletar respostas suficientes do nicho. Persiste o resultado no lead e move o card no Kanban automaticamente.",
      parameters: {
        type: "object",
        properties: {
          niche: { type: "string", description: "Ex: 'previdenciario'" },
          case_type: { type: "string", description: "Ex: 'desconto_indevido', 'bpc_loas', 'demora_inss', 'aposentadoria', 'auxilio_doenca', 'pensao_morte', 'revisao_beneficio'" },
          answers: { type: "object", description: "Respostas estruturadas. SEMPRE inclua 'wants_help' (sim/nao) para liberar agendamento." }
        },
        required: ["niche", "answers"],
        additionalProperties: true
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_appointment",
      description: "Agenda uma consulta/reunião para o lead. Use APÓS o lead confirmar a data/hora oferecida via check_availability.",
      parameters: {
        type: "object",
        properties: {
          message_to_lead: { type: "string" },
          date: { type: "string" },
          time: { type: "string" },
          summary: { type: "string" },
          modality: { type: "string", enum: ["presencial", "online"] },
          unit: { type: "string" }
        },
        required: ["message_to_lead", "date", "time"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere para atendente humano.",
      parameters: {
        type: "object",
        properties: { message_to_lead: { type: "string" } },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "register_client_name",
      description: "Registra o nome completo do lead no sistema.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Nome completo do lead (mínimo 3 palavras)" }
        },
        required: ["full_name"],
        additionalProperties: false
      }
    }
  }
];

// ====== DOCUMENT COLLECTOR TOOLS ======
const documentCollectorTools = [
  {
    type: "function",
    function: {
      name: "register_document",
      description: "Registra que um documento foi recebido do cliente.",
      parameters: {
        type: "object",
        properties: {
          document_type: { type: "string", description: "Tipo do documento (ex: RG, comprovante_endereco, laudo_medico)" },
          notes: { type: "string", description: "Observações sobre o documento" }
        },
        required: ["document_type"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "documents_complete",
      description: "Marca que todos os documentos obrigatórios foram recebidos e avança para análise.",
      parameters: {
        type: "object",
        properties: {
          message_to_lead: { type: "string", description: "Mensagem confirmando que os documentos estão completos" }
        },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere para atendente humano.",
      parameters: {
        type: "object",
        properties: { message_to_lead: { type: "string" } },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  }
];

// ====== VIABILITY ANALYZER TOOLS ======
const viabilityAnalyzerTools = [
  {
    type: "function",
    function: {
      name: "analyze_viability",
      description: "Registra o resultado da análise de viabilidade do caso.",
      parameters: {
        type: "object",
        properties: {
          result: { type: "string", enum: ["viavel", "parcialmente_viavel", "inviavel"] },
          reasoning: { type: "string", description: "Justificativa da análise" },
          recommendations: { type: "string", description: "Recomendações para o caso" },
          estimated_value: { type: "number", description: "Valor estimado do caso (se aplicável)" }
        },
        required: ["result", "reasoning"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "advance_to_contract",
      description: "Avança o lead para a fase de fechamento de contrato.",
      parameters: {
        type: "object",
        properties: {
          message_to_lead: { type: "string" }
        },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere para atendente humano.",
      parameters: {
        type: "object",
        properties: { message_to_lead: { type: "string" } },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  }
];

// ====== CONTRACT CLOSER TOOLS ======
const contractCloserTools = [
  {
    type: "function",
    function: {
      name: "finalize_contract",
      description: "Registra que o contrato foi aceito pelo cliente.",
      parameters: {
        type: "object",
        properties: {
          message_to_lead: { type: "string" },
          client_full_name: { type: "string" },
          contract_value: { type: "number" },
          notes: { type: "string" }
        },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere para atendente humano.",
      parameters: {
        type: "object",
        properties: { message_to_lead: { type: "string" } },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  }
];

// ====== REPLY SANITIZER ======
function sanitizeReply(text: string | null | undefined): string | null {
  if (!text) return null;
  const leakPatterns = [
    /REGRA\s+(CR[ÍI]TICA|DE\s+OURO|INVIOL[ÁA]VEL|FINAL|ABSOLUTA)/i,
    /\bPASSO\s*\d/i,
    /\bETAPA\s*\d/i,
    /case_type|wants_help|decide_lead|schedule_appointment|check_availability|register_client_name|P\d+/i,
    /\[INSTRU[ÇC][ÃA]O\s+INTERNA\]?/i,
    /^Releia\s+(o|todo)/im,
    /Identifique\s+INTERNAMENTE/i,
    /\bFLUXO\s+(OBRIGAT[ÓO]RIO|DISPON[ÍI]VEIS?)/i,
    /MODALIDADE\s+—/i,
    /Em\s+schedule_appointment/i,
  ];
  const cleanedLines = text
    .split(/\r?\n/)
    .filter((line) => !leakPatterns.some((re) => re.test(line)));
  const cleaned = cleanedLines.join("\n").trim();
  if (cleaned.length < Math.min(20, text.length * 0.3)) return null;
  return cleaned;
}

// ====== MAIN AI HANDLER ======
async function handleAgentPhase(
  phase: string,
  config: any,
  agentConfigs: Record<string, any>,
  conversationHistory: { role: string; content: string }[],
  companyId: string,
  leadId: string,
  supabase: any,
  leadName?: string,
  cleanPhone?: string,
  flowsBlock?: string,
  triageBlock?: string,
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  let systemPrompt: string;
  let tools: any[];

  // 🏢 Buscar offices para validação e prompts
  const { data: companyOffices, error: officesError } = await supabase
    .from("company_offices")
    .select("name, address, complement, reference_point, maps_url, is_active, position")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("position", { ascending: true });
  if (officesError) console.error("[SDR] Erro ao buscar offices:", officesError.message);

  if (phase === "document_collector") {
    const agentCfg = agentConfigs["document_collector"];
    const requiredDocs = agentCfg?.required_documents || [];
    systemPrompt = buildDocumentCollectorPrompt(agentCfg, config, leadName, requiredDocs);
    tools = documentCollectorTools;
  } else if (phase === "viability_analyzer") {
    const agentCfg = agentConfigs["viability_analyzer"];
    const { data: leadData } = await supabase.from("leads").select("*").eq("id", leadId).single();
    const { data: docs } = await supabase.from("lead_document_requests").select("*").eq("lead_id", leadId);
    systemPrompt = buildViabilityAnalyzerPrompt(agentCfg, config, leadName, { lead: leadData, documents: docs });
    tools = viabilityAnalyzerTools;
  } else if (phase === "contract_closer") {
    const agentCfg = agentConfigs["contract_closer"];
    const { data: leadData } = await supabase.from("leads").select("viability_result").eq("id", leadId).single();
    systemPrompt = buildContractCloserPrompt(agentCfg, config, leadName, leadData?.viability_result);
    tools = contractCloserTools;
  } else {
    // SDR phase (default)
    systemPrompt = buildSDRPrompt(config, leadName, companyOffices || [], flowsBlock || "", triageBlock || "");
    tools = sdrTools;
    if (config?.debug_mode) {
      console.log("[SDR PROMPT DEBUG]", JSON.stringify({
        companyId,
        flowsCount: flowsBlock ? flowsBlock.split("\n\n").length : 0,
        hasTriageOptions: !!triageBlock,
        promptLength: systemPrompt.length,
      }));
    }
  }

  const coherenceGuard = `

[INSTRUÇÃO INTERNA — NÃO MOSTRAR PRO LEAD, NÃO COPIAR PRO TEXTO DA RESPOSTA]
Antes de responder:
- Releia o histórico acima.
- Veja qual foi sua última pergunta em aberto e o que o lead respondeu agora.
- Se ele já te deu uma informação (nome, tipo de caso, modalidade, turno), NÃO peça de novo.
- Se ele voltou depois de silêncio, continue de onde parou — NÃO se reapresente.
- Responda em UMA mensagem curta (1-3 linhas), tom humano, usando o primeiro nome quando fizer sentido.
- Sua resposta é APENAS o texto que vai pro WhatsApp do lead. Não inclua marcadores, listas de regras, nem mencione "instrução", "regra", "fluxo", "passo", "tool" ou nomes técnicos.`;

  try {
    const aiMessages: any[] = [
      { role: "system", content: systemPrompt + coherenceGuard },
      ...conversationHistory,
    ];

    let replyText = "";
    let qualificationResult: any = null;
    let shouldSchedule = false;
    let maxIterations = 3;

    while (maxIterations > 0) {
      maxIterations--;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          tools,
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI error:", aiResponse.status, await aiResponse.text());
        return null;
      }

      const aiData = await aiResponse.json();
      const message = aiData.choices?.[0]?.message;
      if (!message) return null;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        replyText = message.content || "";
        break;
      }

      aiMessages.push(message);
      let hasCheckAvailability = false;

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let args: any = {};
        try { args = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* ignore */ }

        let toolResult: any = {};

        // ===== SDR TOOLS =====
        if (fnName === "register_client_name") {
          const fullName = String(args.full_name || "").trim();
          const nameOk = isValidFullName(fullName);

          if (!nameOk) {
            toolResult = { success: false, error: "Nome incompleto. Peça o nome COMPLETO com sobrenomes (mínimo 3 palavras, ex: 'João da Silva Santos')." };
          } else if (leadId) {
            await supabase.from("leads").update({
              name: fullName,
              pending_data_warning: null,
            }).eq("id", leadId);
            toolResult = { success: true, full_name: fullName, message: "Nome completo registrado. Agora você já pode chamar check_availability e agendar." };
          } else {
            toolResult = { success: false, error: "Lead não encontrado." };
          }
        }

        if (fnName === "check_availability") {
          hasCheckAvailability = true;
          const dateToCheck = sanitizeDate(args.date);
          const period = String(args.period || "qualquer").toLowerCase();
          const availability = await getAvailableSlots(supabase, companyId, dateToCheck);

          const filterByPeriod = (slots: string[]) => {
            if (period === "manha") return slots.filter(s => parseInt(s.split(":")[0], 10) < 12);
            if (period === "tarde") return slots.filter(s => parseInt(s.split(":")[0], 10) >= 12);
            return slots;
          };

          let filteredSlots = filterByPeriod(availability.slots);
          if (filteredSlots.length === 0 && availability.slots.length > 0) filteredSlots = availability.slots;

          if (filteredSlots.length === 0) {
            const nextDays = getNextAvailableDays(3);
            let firstAlt: { date: string; dayName: string; slot: string } | null = null;
            for (const nd of nextDays) {
              if (nd === dateToCheck) continue;
              const alt = await getAvailableSlots(supabase, companyId, nd);
              const altFiltered = filterByPeriod(alt.slots);
              const finalAlt = altFiltered.length > 0 ? altFiltered : alt.slots;
              if (finalAlt.length > 0) {
                firstAlt = { date: formatDateDMY(nd), dayName: alt.dayName, slot: finalAlt[0] };
                break;
              }
            }
            const formattedDate = formatDateDMY(dateToCheck);
            toolResult = {
              requested_date: formattedDate,
              requested_day: availability.dayName,
              first_available_slot: null,
              message: `Não há horários disponíveis em ${availability.dayName} (${formattedDate}).`,
              alternative: firstAlt,
              instruction: firstAlt
                ? `Ofereça APENAS este horário alternativo: ${firstAlt.dayName}, ${firstAlt.date} às ${firstAlt.slot}.`
                : "Sem horários nos próximos dias úteis. Pergunte outra preferência ao lead.",
            };
          } else {
            const formattedDate = formatDateDMY(dateToCheck);
            const firstSlot = filteredSlots[0];
            toolResult = {
              date: formattedDate,
              day_name: availability.dayName,
              first_available_slot: firstSlot,
              instruction: `Ofereça APENAS este horário ao lead: ${availability.dayName}, ${formattedDate} às ${firstSlot}. NÃO mencione outros horários.`,
            };
          }
        }

        if (fnName === "decide_lead") {
          // 🛡️ Prevenção de qualificação duplicada: se o lead já tiver um score definitivo e não for SDR, evitamos re-classificar
          const { data: existingLead } = await supabase.from("leads").select("lead_score, bot_agent_phase").eq("id", leadId).maybeSingle();
          if (existingLead?.lead_score && existingLead?.bot_agent_phase && existingLead.bot_agent_phase !== "sdr") {
            toolResult = { success: true, classification: existingLead.lead_score, note: "O lead já foi classificado anteriormente." };
          } else {
            try {
            const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const decRes = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/decision-engine`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({
                  lead_id: leadId,
                  company_id: companyId,
                  niche: args.niche,
                  case_type: args.case_type ?? null,
                  answers: args.answers || {},
                  dry_run: false,
                }),
              }
            );
            toolResult = await decRes.json();
            if (toolResult?.classification) {
              qualificationResult = {
                status:
                  toolResult.classification === "quente" ? "qualified"
                  : toolResult.classification === "frio" ? "not_qualified"
                  : "needs_more_info",
                reason: toolResult.reason || "",
                summary: `Decision Engine: ${toolResult.classification} (score ${toolResult.score})`,
                lead_score: toolResult.classification === "invalido" ? "frio" : toolResult.classification,
              };
            }
            } catch (e) {
              console.error("decide_lead error:", e);
              toolResult = { error: "Falha ao chamar decision-engine" };
            }
          }
        }

        if (fnName === "schedule_appointment") {
          const pendingItems: string[] = [];
          if (leadId) {
            const { data: leadCheck } = await supabase
              .from("leads")
              .select("name")
              .eq("id", leadId)
              .maybeSingle();
            if (!isValidFullName(leadCheck?.name || "")) pendingItems.push("Nome completo");
          }
          const pendingWarning = pendingItems.length > 0 ? `${pendingItems.join(" + ")} pendente(s)` : null;

          shouldSchedule = true;
          replyText = args.message_to_lead || "";

          if (leadId) {
            const appointmentDate = sanitizeDate(args.date);
            const appointmentTime = args.time || "10:00";
            const dueAt = `${appointmentDate}T${appointmentTime}:00-03:00`;
            let modality = args.modality || "online";
            let unitName = args.unit || "";

            // 🛡️ Validação de Modality e Unit (evita alucinação de endereços)
            const activeOfficesList = companyOffices || [];
            const hasOffices = activeOfficesList.length > 0;

            if (!hasOffices) {
              modality = "online";
              unitName = "Online";
            } else if (modality === "presencial") {
              const matchedOffice = activeOfficesList.find((o: any) => o.name.toLowerCase().trim() === unitName.toLowerCase().trim());
              if (matchedOffice) {
                unitName = matchedOffice.name;
              } else {
                unitName = activeOfficesList[0].name;
              }
            } else {
              modality = "online";
              unitName = "Online";
            }

            const { data: leadData } = await supabase.from("leads").select("name, phone, whatsapp").eq("id", leadId).single();
            const lName = leadData?.name || "Lead";
            const leadPhone = leadData?.whatsapp || leadData?.phone || cleanPhone || "Não informado";

            await supabase.from("lead_reminders").insert({
              lead_id: leadId, company_id: companyId, created_by: "00000000-0000-0000-0000-000000000000",
              title: `📅 Consulta ${modality === "presencial" ? "presencial" : "online"}: ${lName}${pendingWarning ? " ⚠️" : ""}`,
              description: `${args.summary || `Agendamento automático via bot IA (${modality})${unitName ? ` - Unidade: ${unitName}` : ""}`}${pendingWarning ? `\n\n⚠️ DADOS PENDENTES: ${pendingWarning}. Solicitar na reunião.` : ""}`,
              reminder_type: "meeting", due_at: dueAt,
            });

            await supabase.from("leads").update({ pending_data_warning: pendingWarning }).eq("id", leadId);

            if (config.alert_whatsapp) {
              try {
                const SERVER_URL = "https://ziondigital.uazapi.com";
                const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
                const alertPhone = config.alert_whatsapp.replace(/\D/g, "");
                const modalityLabel = modality === "presencial" ? "🏢 Presencial" : "💻 Online (vídeo)";
                const unitLine = modality === "presencial" && unitName ? `🏢 Unidade: ${unitName}\n` : "";
                const pendingLine = pendingWarning ? `\n⚠️ *DADOS PENDENTES:* ${pendingWarning}\n_Solicitar na reunião pra registrar no sistema._\n` : "";
                const alertMessage = `🔔 *Novo Agendamento Automático*\n\n👤 Nome: ${lName}\n📱 Telefone: ${leadPhone}\n📅 Data: ${appointmentDate}\n⏰ Horário: ${appointmentTime}\n📍 Modalidade: ${modalityLabel}\n${unitLine}${args.summary ? `📋 Assunto: ${args.summary}\n` : ""}${pendingLine}\n_Agendado automaticamente pelo bot SDR_`;
                const alertHeaders: Record<string, string> = { "Content-Type": "application/json" };
                if (ADMIN_TOKEN) alertHeaders["admintoken"] = ADMIN_TOKEN;
                const instanceParam = encodeURIComponent(config.zapi_instance_id || "");
                const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id || "");
                await fetch(`${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`, {
                  method: "POST", headers: alertHeaders,
                  body: JSON.stringify({ number: alertPhone, text: alertMessage }),
                });
              } catch (alertErr) {
                console.error("[SCHEDULE] Error sending alert:", alertErr);
              }
            }

            const docAgent = agentConfigs["document_collector"];
            if (docAgent?.is_active) {
              await supabase.from("leads").update({ bot_agent_phase: "document_collector" }).eq("id", leadId);
              console.log(`Lead ${leadId} advanced to document_collector phase`);
            }
          }
          toolResult = { success: true, message: pendingWarning ? `Agendamento criado, mas marcado com pendência: ${pendingWarning}` : "Agendamento criado com sucesso", pending: pendingWarning };
        }

        // ===== DOCUMENT COLLECTOR TOOLS =====
        if (fnName === "register_document") {
          await supabase.from("lead_document_requests").insert({
            lead_id: leadId, company_id: companyId,
            document_type: args.document_type || "documento",
            status: "received", notes: args.notes || null,
            received_at: new Date().toISOString(),
          });
          toolResult = { success: true, document_type: args.document_type, status: "received" };
        }

        if (fnName === "documents_complete") {
          replyText = args.message_to_lead || "Documentos completos! ✅";
          const viabilityAgent = agentConfigs["viability_analyzer"];
          if (viabilityAgent?.is_active) {
            await supabase.from("leads").update({ bot_agent_phase: "viability_analyzer" }).eq("id", leadId);
            console.log(`Lead ${leadId} advanced to viability_analyzer phase`);
          }
          toolResult = { success: true };
        }

        // ===== VIABILITY ANALYZER TOOLS =====
        if (fnName === "analyze_viability") {
          const viabilityData = {
            result: args.result, reasoning: args.reasoning,
            recommendations: args.recommendations || "",
            estimated_value: args.estimated_value || null,
            analyzed_at: new Date().toISOString(),
          };
          await supabase.from("leads").update({ viability_result: viabilityData }).eq("id", leadId);
          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🔍 Análise de Viabilidade: ${args.result}\n\n${args.reasoning}${args.recommendations ? `\n\nRecomendações: ${args.recommendations}` : ""}`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });
          toolResult = { success: true, result: args.result };
        }

        if (fnName === "advance_to_contract") {
          replyText = args.message_to_lead || "";
          const contractAgent = agentConfigs["contract_closer"];
          if (contractAgent?.is_active) {
            await supabase.from("leads").update({ bot_agent_phase: "contract_closer" }).eq("id", leadId);
            console.log(`Lead ${leadId} advanced to contract_closer phase`);
          }
          toolResult = { success: true };
        }

        // ===== CONTRACT CLOSER TOOLS =====
        if (fnName === "finalize_contract") {
          replyText = args.message_to_lead || "Contrato finalizado! 🎉";
          const updates: any = { contract_status: "signed", bot_agent_phase: "completed" };
          if (args.client_full_name) updates.name = args.client_full_name;
          if (args.contract_value) {
            updates.value = args.contract_value;
            updates.honorarios_estimados = args.contract_value;
          }
          await supabase.from("leads").update(updates).eq("id", leadId);

          const { data: commissionCfg } = await supabase
            .from("commission_settings")
            .select("commission_percentage")
            .eq("company_id", companyId)
            .maybeSingle();

          await supabase.from("closed_contracts").insert({
            company_id: companyId,
            lead_id: leadId,
            client_name: args.client_full_name || leadName || "Cliente",
            client_cpf: null,
            client_phone: cleanPhone || null,
            honorarios_estimados: Number(args.contract_value || 0),
            commission_percentage: Number(commissionCfg?.commission_percentage || 30),
            commission_status: "aguardando_exito",
            process_status: "em_andamento",
            signed_at: new Date().toISOString(),
            created_by: "00000000-0000-0000-0000-000000000000",
          });

          const { data: wonCol } = await supabase.from("kanban_columns").select("id")
            .eq("company_id", companyId).eq("is_won", true).order("position", { ascending: false }).limit(1).maybeSingle();
          if (wonCol) {
            await supabase.from("leads").update({ kanban_column_id: wonCol.id, status: "won" }).eq("id", leadId);
          }

          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🎉 Contrato fechado automaticamente pelo bot!\n${args.notes || ""}`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });

          if (config.alert_whatsapp) {
            try {
              const SERVER_URL = "https://ziondigital.uazapi.com";
              const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
              const alertPhone = String(config.alert_whatsapp).replace(/\D/g, "");
              const alertMessage = `🎉 *Contrato Fechado Automaticamente!*\n\n👤 Cliente: ${args.client_full_name || leadName || "N/A"}\n${args.contract_value ? `💰 Valor: R$ ${args.contract_value}\n` : ""}\n_Fechado automaticamente pelo bot de contrato_`;
              const alertHeaders: Record<string, string> = { "Content-Type": "application/json" };
              if (ADMIN_TOKEN) alertHeaders["admintoken"] = ADMIN_TOKEN;
              const instanceParam = encodeURIComponent(config.zapi_instance_id || "");
              const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id || "");
              await fetch(`${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`, {
                method: "POST", headers: alertHeaders,
                body: JSON.stringify({ number: alertPhone, text: alertMessage }),
              });
            } catch (e) { console.error("Contract alert error:", e); }
          }
          toolResult = { success: true };
        }

        if (fnName === "transfer_to_human") {
          replyText = args.message_to_lead || "Um especialista irá atendê-lo em breve!";
          toolResult = { success: true };
        }

        aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }

      if ((shouldSchedule || replyText) && !hasCheckAvailability) break;
    }

    // SDR post-processing (qualification + kanban moves)
    if (phase === "sdr") {
      if (shouldSchedule && leadId) {
        const targetPosition = 6;
        const { data: columns } = await supabase.from("kanban_columns").select("id")
          .eq("company_id", companyId).order("position", { ascending: true }).limit(targetPosition + 1);
        if (columns && columns.length > targetPosition) {
          await supabase.from("leads").update({ kanban_column_id: columns[targetPosition].id, status: "qualified" }).eq("id", leadId);
        }
        if (!qualificationResult) {
          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🤖 Agendamento realizado automaticamente pelo bot SDR`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });
        }
      }

      if (qualificationResult && leadId) {
        const scoreUpdate: any = {};
        if (qualificationResult.lead_score) scoreUpdate.lead_score = qualificationResult.lead_score;

        if (qualificationResult.status === "qualified" || shouldSchedule) {
          const newStatus = shouldSchedule ? "qualified" : "contacted";
          await supabase.from("leads").update({
            status: newStatus,
            notes: `[IA] ${qualificationResult.reason}${qualificationResult.summary ? ` | ${qualificationResult.summary}` : ""}`,
            ...scoreUpdate,
          }).eq("id", leadId);

          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🤖 ${shouldSchedule ? "Agendamento" : "Qualificação"}: ${qualificationResult.reason}${qualificationResult.summary ? `\n\nResumo: ${qualificationResult.summary}` : ""}`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });

          if (!shouldSchedule) {
            const { data: emAtCol } = await supabase.from("kanban_columns").select("id")
              .eq("company_id", companyId).eq("position", 0).maybeSingle();
            if (emAtCol) {
              await supabase.from("leads").update({ kanban_column_id: emAtCol.id }).eq("id", leadId);
            }
          }
        } else if (qualificationResult.status === "not_qualified") {
          const { data: lostColumn } = await supabase.from("kanban_columns").select("id")
            .eq("company_id", companyId).eq("is_lost", true).maybeSingle();
          await supabase.from("leads").update({
            status: "lost", notes: `[IA - Não qualificado] ${qualificationResult.reason}`,
            ...scoreUpdate, ...(lostColumn ? { kanban_column_id: lostColumn.id } : {}),
          }).eq("id", leadId);
          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🤖 Lead não qualificado: ${qualificationResult.reason}`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });
        } else {
          if (Object.keys(scoreUpdate).length > 0) {
            await supabase.from("leads").update(scoreUpdate).eq("id", leadId);
          }
        }
      }
    }

    return sanitizeReply(replyText) || null;
  } catch (error) {
    console.error("AI agent error:", error);
    return null;
  }
}

// ====== CADENCE ======
async function enrollInCadence(supabase: any, companyId: string, leadId: string, phone: string) {
  await supabase.from("cadence_messages").update({ status: "cancelled" })
    .eq("lead_id", leadId).eq("status", "pending");

  const delayMinutes = await getCadenceDelayForStep(supabase, companyId, 1);
  if (delayMinutes === null) return;

  const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  const { error } = await supabase.from("cadence_messages").insert({
    company_id: companyId,
    lead_id: leadId,
    phone,
    day_number: 1,
    message_text: null,
    scheduled_at: scheduledAt,
    status: "pending",
  });
  if (error) console.error("Error enrolling in cadence:", error);
  else console.log(`Lead ${leadId} enrolled in cadence step 1 in ${delayMinutes}min`);
}

async function getCadenceDelayForStep(
  supabase: any,
  companyId: string,
  stepNumber: number,
): Promise<number | null> {
  const defaults: Record<number, number> = {
    1: 30, 2: 60 * 24, 3: 60 * 24, 4: 60 * 24, 5: 60 * 24,
  };

  const { data: customStep } = await supabase
    .from("company_cadence_config")
    .select("delay_minutes, enabled")
    .eq("company_id", companyId)
    .eq("step_number", stepNumber)
    .maybeSingle();

  if (customStep) {
    if (customStep.enabled === false) return null;
    return customStep.delay_minutes ?? defaults[stepNumber] ?? 60 * 24;
  }
  return defaults[stepNumber] ?? null;
}

// ====== MESSAGE SPLITTER ======
function splitIntoNaturalMessages(text: string): string[] {
  if (!text) return [text];
  const trimmed = text.trim();
  if (!trimmed) return [trimmed];

  const paragraphs = trimmed.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const rawSentences: string[] = [];

  for (const para of paragraphs) {
    const matches = para.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g);
    if (!matches) { rawSentences.push(para); continue; }
    for (const m of matches) {
      const s = m.trim();
      if (s) rawSentences.push(s);
    }
  }

  const messages: string[] = [];
  let buffer = "";

  const flush = () => {
    const v = buffer.trim();
    if (v) messages.push(v);
    buffer = "";
  };

  for (const sentence of rawSentences) {
    const isQuestion = /[?]["')\]]*\s*$/.test(sentence);
    const isExclam = /[!]["')\]]*\s*$/.test(sentence) && sentence.length < 80;
    const isShort = sentence.length < 60;

    if (isQuestion || isExclam) {
      flush();
      messages.push(sentence);
      continue;
    }

    if (!buffer) {
      buffer = sentence;
      continue;
    }

    if (isShort && buffer.length + sentence.length + 1 <= 140) {
      buffer = `${buffer} ${sentence}`;
    } else {
      flush();
      buffer = sentence;
    }
  }
  flush();

  return messages.length > 0 ? messages : [trimmed];
}

// ====== MAIN HANDLER ======
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      return new Response(JSON.stringify({ error: "Missing company_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select(`
        id, company_id, zapi_instance_id, zapi_token, ai_enabled, ai_prompt, ai_auto_reply, 
        office_name, practice_area, communication_tone, scheduling_link, consultation_duration, 
        target_audience, alert_whatsapp, triage_options, debug_mode,
        companies (name, bot_name, bot_role_description)
      `)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Company not configured" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FIX 1: buscar fluxos ativos uma única vez por request
    const { data: flows, error: flowsError } = await supabase
      .from("company_bot_flows")
      .select("flow_key, label, custom_prompt_block, position")
      .eq("company_id", companyId)
      .eq("enabled", true)
      .order("position", { ascending: true });
    if (flowsError) console.error("[flows] Erro ao buscar fluxos:", flowsError.message);
    const flowsBlock = flows?.length
      ? flows.map((f: any) => (f.custom_prompt_block?.trim() || "").trim()).filter(Boolean).join("\n\n")
      : "";

    // FIX 2: montar bloco de triage_options uma única vez por request
    const triageOptions = (config as any).triage_options || [];
    const triageBlock = Array.isArray(triageOptions) && triageOptions.length
      ? `Qualifique o lead APENAS se ele mencionar uma das situações abaixo:\n` +
        triageOptions
          .map((t: any) => `- ${t.label || t.name || ""}${t.keywords?.length ? ` (palavras-chave: ${t.keywords.join(", ")})` : ""}`)
          .join("\n") +
        `\n\nSe a demanda NÃO bater com nenhuma dessas situações, classifique como "not_qualified" e encerre com empatia.\nSe bater, classifique como "qualified" e convide para a reunião.`
      : "";

    const { data: agentRows } = await supabase
      .from("company_bot_agents")
      .select("*")
      .eq("company_id", companyId);

    const agentConfigs: Record<string, any> = {};
    (agentRows || []).forEach((a: any) => { agentConfigs[a.agent_type] = a; });

    const body = await req.json();
    console.log("Z-API webhook payload:", JSON.stringify(body).substring(0, 500));

    if (!body) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isUaZapiMessage = body.EventType === "messages" && body.message && !body.message.fromMe;
    const isLegacyMessage = body.type === "ReceivedCallback";

    if (!isUaZapiMessage && !isLegacyMessage) {
      if (body.type === "ReadReceipt" || body.type === "SentCallback" || body.type === "MessageStatusCallback" || body.EventType === "messages_update") {
        return new Response(JSON.stringify({ ok: true, type: body.type || body.EventType }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let phone: string, senderName: string, messageText: string, messageIdExternal: string, isGroup: boolean;
    let audioUrl: string | null = null;
    let messageType: string = "text";

    if (isUaZapiMessage) {
      const msg = body.message;
      phone = msg.sender_pn || msg.chatid || "";
      senderName = msg.senderName || body.chat?.name || body.chat?.wa_contactName || "";
      messageText = msg.text || msg.content || msg.caption || "";
      messageIdExternal = msg.messageid || msg.id || "";
      isGroup = msg.isGroup || false;
      messageType = (msg.type || msg.messageType || "").toString().toLowerCase();
      if (messageType.includes("audio") || messageType === "ptt" || messageType === "voice") {
        audioUrl = msg.audio?.url || msg.audio?.audioUrl || msg.mediaUrl || msg.fileURL || msg.url || msg.media?.url || null;
      }
      if (!messageText) messageText = "[mídia]";
    } else {
      phone = body.phone || "";
      senderName = body.senderName || body.chatName || "";
      messageText = body.text?.message || body.image?.caption || body.video?.caption || "";
      messageIdExternal = body.messageId || "";
      isGroup = body.isGroup || false;
      if (body.audio || body.ptt) {
        audioUrl = body.audio?.audioUrl || body.audio?.url || body.ptt?.audioUrl || body.ptt?.url || null;
        messageType = "audio";
      }
      if (!messageText) messageText = "[mídia]";
    }

    // ===== TRANSCRIÇÃO DE ÁUDIO (Whisper) =====
    if (audioUrl) {
      try {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiKey) {
          console.error("[audio] OPENAI_API_KEY não configurada");
        } else {
          console.log(`[audio] Baixando áudio de: ${audioUrl}`);
          const audioResp = await fetch(audioUrl);
          if (!audioResp.ok) {
            console.error(`[audio] Falha ao baixar áudio: ${audioResp.status}`);
          } else {
            const audioBlob = await audioResp.blob();
            const audioSize = audioBlob.size;
            console.log(`[audio] Áudio baixado: ${audioSize} bytes`);

            if (audioSize > 25 * 1024 * 1024) {
              console.error("[audio] Áudio maior que 25MB");
              messageText = "[áudio muito longo — não transcrito]";
            } else {
              const fd = new FormData();
              fd.append("file", audioBlob, "audio.ogg");
              fd.append("model", "whisper-1");
              fd.append("language", "pt");
              fd.append("response_format", "json");
              fd.append("temperature", "0");

              const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${openaiKey}` },
                body: fd,
              });

              if (!whisperResp.ok) {
                const errTxt = await whisperResp.text();
                console.error(`[audio] Whisper falhou ${whisperResp.status}: ${errTxt}`);
                messageText = "[áudio recebido — não foi possível transcrever]";
              } else {
                const whisperData = await whisperResp.json();
                const transcription = (whisperData.text || "").trim();
                if (transcription) {
                  console.log(`[audio] Transcrição (${transcription.length} chars): ${transcription.substring(0, 120)}...`);
                  messageText = `🎤 [áudio transcrito]: ${transcription}`;
                } else {
                  messageText = "[áudio sem fala detectada]";
                }
              }
            }
          }
        }
      } catch (audioErr) {
        console.error("[audio] Erro inesperado na transcrição:", audioErr);
        messageText = "[áudio recebido — erro ao transcrever]";
      }
    }

    if (typeof messageText !== "string") {
      messageText = String(messageText ?? "");
    }

    if (isGroup || !phone) {
      return new Response(JSON.stringify({ ok: true, skipped: isGroup ? "group_message" : "no_phone" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = phone.replace("@c.us", "").replace("@s.whatsapp.net", "");

    // Extract tracking code
    let trackingCode: string | null = null;
    let utmData: any = {};
    let detectedSource: string | null = null;

    const codeMatch = messageText.match(/\[([a-zA-Z0-9]{6})\]/);
    if (codeMatch) {
      trackingCode = codeMatch[1].toUpperCase();
      console.log(`[tracking] Found tracking code: ${trackingCode}`);

      const { data: click } = await supabase.from("tracking_clicks")
        .select("id, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
        .eq("tracking_code", trackingCode)
        .maybeSingle();

      if (click) {
        utmData = {
          utm_source: click.utm_source || undefined,
          utm_medium: click.utm_medium || undefined,
          utm_campaign: click.utm_campaign || undefined,
          utm_content: click.utm_content || undefined,
          utm_term: click.utm_term || undefined,
        };
        const src = (click.utm_source || "").toLowerCase();
        if (src.includes("google") || src === "gads" || src.includes("youtube")) {
          detectedSource = "google";
        } else if (
          src.includes("meta") || src.includes("facebook") || src.includes("instagram") ||
          src === "fb" || src === "ig" || src === "ads"
        ) {
          detectedSource = "meta";
        }
      } else {
        console.log(`[tracking] No click record found for code: ${trackingCode}`);
      }
    }

    // Find or create lead
    const { data: existingLead } = await supabase.from("leads")
      .select("id, status, bot_disabled, bot_agent_phase")
      .eq("company_id", companyId)
      .or(`phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone}`)
      .maybeSingle();

    let leadId = existingLead?.id;
    let currentPhase = existingLead?.bot_agent_phase || "sdr";

    if (!leadId) {
      const { data: firstColumn } = await supabase.from("kanban_columns").select("id")
        .eq("company_id", companyId).order("position", { ascending: true }).limit(1).maybeSingle();

      const { data: newLead, error: leadError } = await supabase.from("leads").insert({
        company_id: companyId, name: senderName || `Lead ${cleanPhone}`,
        phone: cleanPhone, whatsapp: cleanPhone, status: "new", lead_score: "morno",
        kanban_column_id: firstColumn?.id || null, bot_agent_phase: "sdr",
        ...(detectedSource && { source: detectedSource }), ...utmData,
      }).select("id").single();

      if (leadError) { console.error("Error creating lead:", leadError); }
      else {
        leadId = newLead.id;
        currentPhase = "sdr";
        console.log("New lead created:", leadId);
        await enrollInCadence(supabase, companyId, leadId, cleanPhone);
      }
    } else {
      await supabase.from("cadence_messages").update({ status: "cancelled" })
        .eq("lead_id", leadId).eq("status", "pending");

      if (existingLead?.status === "new") {
        const { data: emAtendimentoCol } = await supabase.from("kanban_columns").select("id")
          .eq("company_id", companyId).eq("position", 0).maybeSingle();
        if (emAtendimentoCol) {
          await supabase.from("leads").update({ kanban_column_id: emAtendimentoCol.id, status: "contacted" }).eq("id", leadId);
        }
      }

      if (Object.keys(utmData).length > 0) {
        const { data: existingLeadData } = await supabase.from("leads").select("utm_source, source").eq("id", leadId).single();
        if (existingLeadData) {
          const updates: Record<string, string> = {};
          if (!existingLeadData.utm_source) Object.assign(updates, utmData);
          if (!existingLeadData.source && detectedSource) updates.source = detectedSource;
          if (Object.keys(updates).length > 0) await supabase.from("leads").update(updates).eq("id", leadId);
        }
      }
    }

    if (trackingCode && leadId) {
      await supabase.from("tracking_clicks").update({ lead_id: leadId, matched_at: new Date().toISOString() })
        .eq("tracking_code", trackingCode).is("lead_id", null);
    }

    // Deduplicate
    if (messageIdExternal) {
      const { data: existingMsg } = await supabase.from("whatsapp_messages").select("id")
        .eq("message_id_external", messageIdExternal).maybeSingle();
      if (existingMsg) {
        return new Response(JSON.stringify({ ok: true, skipped: "duplicate" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Store incoming message
    const incomingTimestamp = body.mompiont ? new Date(body.mompiont * 1000).toISOString() : new Date().toISOString();
    await supabase.from("whatsapp_messages").insert({
      company_id: companyId, lead_id: leadId || null, phone: cleanPhone,
      message_text: messageText, direction: "incoming", sender_name: senderName,
      message_id_external: messageIdExternal,
      timestamp: incomingTimestamp,
    });

    // AI Auto-Reply with multi-agent support
    if (config.ai_enabled && config.ai_auto_reply && leadId && !existingLead?.bot_disabled) {
      try {
        const leadStatus = existingLead?.status;
        const isCompleted = currentPhase === "completed";
        const isAlreadyHandled = leadStatus && !["new", "contacted", "qualified", "negotiating"].includes(leadStatus);

        if (!isCompleted && !isAlreadyHandled) {
          let effectivePhase = currentPhase;
          if (effectivePhase !== "sdr" && !agentConfigs[effectivePhase]?.is_active) {
            effectivePhase = "sdr";
          }

          // Debounce 7s para agrupar rajada
          await new Promise((r) => setTimeout(r, 7000));

          const { data: newerMsg } = await supabase.from("whatsapp_messages")
            .select("id, timestamp")
            .eq("company_id", companyId)
            .eq("phone", cleanPhone)
            .eq("direction", "incoming")
            .gt("timestamp", incomingTimestamp)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (newerMsg) {
            console.log(`[debounce] Pulando resposta para ${cleanPhone}: chegou msg mais nova.`);
            return new Response(
              JSON.stringify({ ok: true, lead_id: leadId, debounced: true }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          const { data: leadData } = await supabase.from("leads").select("name").eq("id", leadId).single();
          const currentLeadName = leadData?.name || senderName || undefined;

          const { data: recentMsgs } = await supabase.from("whatsapp_messages")
            .select("message_text, direction").eq("company_id", companyId)
            .eq("phone", cleanPhone).order("timestamp", { ascending: false }).limit(30);

          const history = (recentMsgs || []).reverse().map((m: any) => ({
            role: m.direction === "incoming" ? "user" : "assistant",
            content: m.message_text || "",
          }));

          const aiReply = await handleAgentPhase(
            effectivePhase, config, agentConfigs, history,
            companyId, leadId, supabase, currentLeadName, cleanPhone,
            flowsBlock, triageBlock,
          );

          const SERVER_URL = "https://ziondigital.uazapi.com";
          const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
          const sendHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (ADMIN_TOKEN) sendHeaders["admintoken"] = ADMIN_TOKEN;

          const instanceParam = encodeURIComponent(config.zapi_instance_id);
          const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id);
          const sendUrl = `${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`;

          if (aiReply) {
            const splitMessages = splitIntoNaturalMessages(aiReply);
            console.log(`[${effectivePhase}] Sending ${splitMessages.length} message(s) to:`, cleanPhone);

            for (let i = 0; i < splitMessages.length; i++) {
              const chunk = splitMessages[i].trim();
              if (!chunk) continue;

              const delayMs = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000;
              await new Promise((r) => setTimeout(r, delayMs));

              const sendResponse = await fetch(sendUrl, {
                method: "POST", headers: sendHeaders,
                body: JSON.stringify({ number: cleanPhone, text: chunk }),
              });

              if (sendResponse.ok) {
                const sendResult = await sendResponse.json();
                await supabase.from("whatsapp_messages").insert({
                  company_id: companyId, lead_id: leadId, phone: cleanPhone,
                  message_text: chunk, direction: "outgoing", sender_name: "IA",
                  message_id_external: sendResult.messageId || sendResult.key?.id || null,
                  timestamp: new Date().toISOString(),
                });
              } else {
                console.error("Failed to send AI reply:", sendResponse.status, await sendResponse.text());
              }
            }
            if (leadId) {
              await enrollInCadence(supabase, companyId, leadId, cleanPhone);
            }
          } else {
            console.error(`[${effectivePhase}] AI returned null for lead ${leadId}. Sending fallback.`);
            const fallbackText = "Deixa eu olhar isso aqui com calma e já te respondo, tá bom? 🙏";
            try {
              const fbResp = await fetch(sendUrl, {
                method: "POST", headers: sendHeaders,
                body: JSON.stringify({ number: cleanPhone, text: fallbackText }),
              });
              if (fbResp.ok) {
                const fbResult = await fbResp.json();
                await supabase.from("whatsapp_messages").insert({
                  company_id: companyId, lead_id: leadId, phone: cleanPhone,
                  message_text: fallbackText, direction: "outgoing", sender_name: "IA (fallback)",
                  message_id_external: fbResult.messageId || fbResult.key?.id || null,
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (fbErr) {
              console.error("Fallback message send error:", fbErr);
            }

            if (leadId) {
              await enrollInCadence(supabase, companyId, leadId, cleanPhone);
            }

            if (config.alert_whatsapp) {
              try {
                const alertPhone = String(config.alert_whatsapp).replace(/\D/g, "");
                const lastMsg = history.length > 0 ? history[history.length - 1].content : "(sem texto)";
                const alertText = `⚠️ *Lead sem resposta da IA*\n\n👤 ${currentLeadName || "Lead"}\n📱 ${cleanPhone}\n\n💬 Última msg do lead:\n_"${String(lastMsg).substring(0, 300)}"_\n\nA IA não conseguiu responder. Por favor assumir manualmente.`;
                await fetch(sendUrl, {
                  method: "POST", headers: sendHeaders,
                  body: JSON.stringify({ number: alertPhone, text: alertText }),
                });
              } catch (alertErr) {
                console.error("Alert manager error:", alertErr);
              }
            }
          }
        }
      } catch (aiError) {
        console.error("AI auto-reply error:", aiError);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, lead_id: leadId, new_lead: !existingLead, tracking_code: trackingCode, agent_phase: currentPhase }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = getErrorMessage(error, "Unknown error");
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

```

---

## Arquivo: supabase/functions/zapi-webhook/index_test.ts

```typescript

import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mock para testes básicos de lógica
Deno.test("Validation Logic: Modality and Unit", () => {
  const mockOffices = [
    { name: "Unidade Centro", is_active: true },
    { name: "Unidade Sul", is_active: true }
  ];

  // Simulando a lógica que implementamos no webhook
  const validateModality = (args: any, companyOffices: any[]) => {
    let modality = args.modality || "online";
    let unitName = args.unit || "";
    const activeOfficesList = companyOffices || [];
    const hasOffices = activeOfficesList.length > 0;

    if (!hasOffices) {
      modality = "online";
      unitName = "Online";
    } else if (modality === "presencial") {
      const matchedOffice = activeOfficesList.find((o: any) => o.name.toLowerCase().trim() === unitName.toLowerCase().trim());
      if (matchedOffice) {
        unitName = matchedOffice.name;
      } else {
        unitName = activeOfficesList[0].name;
      }
    } else {
      modality = "online";
      unitName = "Online";
    }
    return { modality, unitName };
  };

  // Teste 1: Sem unidades
  const res1 = validateModality({ modality: "presencial", unit: "Qualquer" }, []);
  assertEquals(res1.modality, "online");
  assertEquals(res1.unitName, "Online");

  // Teste 2: Unidade válida
  const res2 = validateModality({ modality: "presencial", unit: "unidade sul" }, mockOffices);
  assertEquals(res2.modality, "presencial");
  assertEquals(res2.unitName, "Unidade Sul");

  // Teste 3: Unidade inválida (alucinação) -> deve cair na primeira
  const res3 = validateModality({ modality: "presencial", unit: "Endereço Inventado" }, mockOffices);
  assertEquals(res3.modality, "presencial");
  assertEquals(res3.unitName, "Unidade Centro");

  // Teste 4: Online deve limpar unit
  const res4 = validateModality({ modality: "online", unit: "Unidade Centro" }, mockOffices);
  assertEquals(res4.modality, "online");
  assertEquals(res4.unitName, "Online");
});

Deno.test("Debug Mode Flag Logic", () => {
  const config = { debug_mode: true };
  let logCalled = false;
  
  const logDebug = (cfg: any) => {
    if (cfg?.debug_mode) {
      logCalled = true;
    }
  };

  logDebug(config);
  assert(logCalled, "Log should be called when debug_mode is true");

  logCalled = false;
  logDebug({ debug_mode: false });
  assert(!logCalled, "Log should NOT be called when debug_mode is false");
});

```

---

