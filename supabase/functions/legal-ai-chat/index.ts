// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

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
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return jsonResponse(req, { error: "LOVABLE_API_KEY não configurada" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { error: "Não autenticado" }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsError } = await userClient.auth.getClaims(accessToken);
    if (claimsError || !claims?.claims?.sub) {
      return jsonResponse(req, { error: "Token inválido" }, 401);
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
      return jsonResponse(req, { error: "Parâmetros inválidos" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Role check (Server-side)
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    const role = roleData?.role;
    const isStaff = role === "admin" || role === "member";

    // Multi-tenant check (Bypassed for staff)
    if (!isStaff) {
      const { data: membership } = await admin
        .from("client_companies")
        .select("id")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (!membership) {
        return jsonResponse(req, { error: "Sem acesso a esta empresa" }, 403);
      }
    }

    // Rate Limiting
    const isAllowed = await checkRateLimit(admin, userId, "legal-ai-chat", 60);
    if (!isAllowed) {
      return jsonResponse(req, { error: "Limite de uso atingido" }, 429);
    }

    // Verifica acesso da empresa
    const { data: company, error: cErr } = await admin
      .from("companies")
      .select("id, partnership_type, billing_model")
      .eq("id", companyId)
      .single();

    if (cErr || !company) {
      return jsonResponse(req, { error: "Empresa não encontrada" }, 404);
    }

    // Subscription Check (Bypassed for Staff and Plan Free)
    if (!isStaff && company.billing_model !== "plan_free") {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub?.status === "overdue" || sub?.status === "cancelled") {
        return jsonResponse(req, { error: "Assinatura inativa" }, 403);
      }
    }

    // Partnership check
    if (company.partnership_type !== "mensalidade_zionads" && company.billing_model !== "plan_free") {
      return jsonResponse(req, { error: "Acesso restrito ao plano mensal" }, 403);
    }

    // Garante conversa
    let convId = conversationId;
    const lastUser = messages[messages.length - 1];
    if (!convId) {
      const { data: newConv, error: nErr } = await admin
        .from("legal_ai_conversations")
        .insert({
          company_id: companyId,
          user_id: userId,
          title: lastUser.content.slice(0, 80),
          document_type: documentType ?? null,
        })
        .select("id")
        .single();
      if (nErr) return jsonResponse(req, { error: "Falha ao criar conversa" }, 500);
      convId = newConv.id;
    } else {
      await admin.from("legal_ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
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
        model: "openai/gpt-5",
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text().catch(() => "");
      console.error("AI gateway error:", aiResp.status, errText);
      return jsonResponse(req, { error: "Erro no gateway de IA", status: aiResp.status, detail: errText }, 500);
    }

    const [browserStream, captureStream] = aiResp.body!.tee();
    captureAndSave(captureStream, admin, convId!, documentType ?? null);

    const headers = new Headers({
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "X-Conversation-Id": convId!,
    });
    return new Response(browserStream, { headers });
  } catch (e) {
    return jsonResponse(req, { error: getErrorMessage(e, "Erro inesperado") }, 500);
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
    let assistantText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line.startsWith("data: ")) {
          const json = line.slice(6);
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) assistantText += content;
          } catch { /* ignore */ }
        }
      }
    }

    if (assistantText.trim()) {
      const isDoc = documentType !== null || assistantText.length > 1500;
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

function jsonResponse(req: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(handler);
