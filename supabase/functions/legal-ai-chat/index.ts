// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
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
