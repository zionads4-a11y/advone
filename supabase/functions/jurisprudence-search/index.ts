// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SYSTEM_PROMPT = `Você é uma pesquisadora jurídica sênior brasileira. Recebe um conjunto de trechos e links de tribunais/sites jurídicos e produz uma síntese técnica em português para um(a) advogado(a).

Regras:
- Estruture a resposta em markdown, com as seções:
  ## Resumo da tese
  ## Jurisprudência relevante
  ## Súmulas aplicáveis
  ## Observações práticas
- Em "Jurisprudência relevante", liste cada julgado como bullet: **Tribunal — Órgão — Nº do processo/relator (data)** seguido de 2-3 linhas de ementa/entendimento e ao final [Fonte](URL).
- Em "Súmulas aplicáveis", cite apenas súmulas efetivamente encontradas nos trechos, com número + texto resumido + tribunal.
- Se os trechos não trouxerem julgados suficientes, diga claramente "Não foram encontrados julgados diretos nos resultados; recomenda-se busca manual em [links]". NUNCA invente ementa, número de processo, relator ou data.
- Use apenas as URLs fornecidas nos trechos como fonte.
- Termine com o disclaimer: "_Confira sempre no site do tribunal antes de utilizar em peças processuais._"`;

async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!LOVABLE_API_KEY) return json(req, { error: "LOVABLE_API_KEY não configurada" }, 500);
    if (!FIRECRAWL_API_KEY) return json(req, { error: "FIRECRAWL_API_KEY não configurada" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Não autenticado" }, 401);

    const accessToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsError } = await userClient.auth.getClaims(accessToken);
    if (claimsError || !claims?.claims?.sub) return json(req, { error: "Token inválido" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const query: string = (body?.query ?? "").toString().trim();
    const tribunal: string = (body?.tribunal ?? "todos").toString();
    const period: string = (body?.period ?? "any").toString(); // any|year|month
    if (!query || query.length < 5) return json(req, { error: "Consulta muito curta" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ok = await checkRateLimit(admin, userId, "jurisprudence-search", 30);
    if (!ok) return json(req, { error: "Limite de uso atingido. Aguarde alguns minutos." }, 429);

    // Monta filtros de domínio conforme tribunal
    const domainMap: Record<string, string[]> = {
      stf: ["portal.stf.jus.br", "jurisprudencia.stf.jus.br"],
      stj: ["scon.stj.jus.br", "processo.stj.jus.br", "stj.jus.br"],
      tst: ["jurisprudencia.tst.jus.br", "tst.jus.br"],
      trf: ["trf1.jus.br", "trf2.jus.br", "trf3.jus.br", "trf4.jus.br", "trf5.jus.br", "trf6.jus.br"],
      tj: ["tjsp.jus.br", "tjrj.jus.br", "tjmg.jus.br", "tjrs.jus.br", "tjpr.jus.br", "tjba.jus.br"],
    };
    const sources = domainMap[tribunal] ?? [
      ...domainMap.stf, ...domainMap.stj, ...domainMap.tst,
    ];

    const siteFilter = sources.map((d) => `site:${d}`).join(" OR ");
    const searchQuery = `(${siteFilter}) ${query} jurisprudência ementa`;

    const tbs =
      period === "year" ? "qdr:y" :
      period === "month" ? "qdr:m" :
      undefined;

    // Firecrawl search
    const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 8,
        lang: "pt",
        country: "br",
        ...(tbs ? { tbs } : {}),
      }),
    });

    if (!fcRes.ok) {
      const t = await fcRes.text().catch(() => "");
      console.error("Firecrawl error:", fcRes.status, t);
      return json(req, { error: "Falha na busca web", detail: t }, 502);
    }

    const fcJson = await fcRes.json();
    // Firecrawl v2 pode retornar { data: [...] } ou { web: [...] }
    const rawResults: any[] =
      (Array.isArray(fcJson?.data) ? fcJson.data : null) ??
      (Array.isArray(fcJson?.web) ? fcJson.web : null) ??
      (Array.isArray(fcJson?.data?.web) ? fcJson.data.web : []) ??
      [];

    const results = rawResults
      .map((r: any) => ({
        title: r.title || r.metadata?.title || "(sem título)",
        url: r.url || r.link || "",
        snippet: (r.description || r.snippet || r.markdown || "").toString().slice(0, 800),
      }))
      .filter((r) => r.url);

    if (results.length === 0) {
      return json(req, {
        answer:
          "## Resumo da tese\nNenhum resultado direto encontrado nas fontes selecionadas.\n\n" +
          "Sugestão: reformule a consulta com termos mais específicos (nome do instituto jurídico, artigo de lei ou nº da súmula) ou amplie o filtro de tribunal.",
        results: [],
      }, 200);
    }

    // Contexto para o modelo
    const context = results
      .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nTrecho: ${r.snippet}`)
      .join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Consulta do advogado: "${query}"\nTribunal foco: ${tribunal}\n\nResultados coletados:\n\n${context}\n\nProduza a síntese conforme as regras.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      console.error("AI error:", aiRes.status, t);
      return json(req, { error: "Falha na IA", detail: t }, 502);
    }
    const aiJson = await aiRes.json();
    const answer = aiJson?.choices?.[0]?.message?.content ?? "";

    return json(req, { answer, results }, 200);
  } catch (e: any) {
    console.error(e);
    return json(req, { error: e?.message ?? "Erro inesperado" }, 500);
  }
}

function json(req: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(handler);
