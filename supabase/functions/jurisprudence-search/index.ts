// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SYSTEM_PROMPT = `Você é uma pesquisadora jurídica sênior brasileira. Recebe um conjunto de trechos e links de tribunais/sites jurídicos e produz uma síntese técnica em português para um(a) advogado(a) que precisa dos NÚMEROS DE PROCESSO (CNJ) para incluir no sistema de monitoramento.

FOCO PRINCIPAL: extrair AÇÕES JUDICIAIS reais com número CNJ (formato NNNNNNN-DD.AAAA.J.TR.OOOO ou similar). Sem número de processo, o resultado é inútil para o advogado.

Regras:
- Estruture a resposta em markdown, com as seções:
  ## Resumo da tese
  ## Ações judiciais encontradas (com nº do processo)
  ## Súmulas aplicáveis
  ## Observações práticas
- Em "Ações judiciais encontradas", liste APENAS julgados que tenham número de processo identificável nos trechos. Formato de cada item:
  - **Nº CNJ:** \`XXXXXXX-XX.XXXX.X.XX.XXXX\`  ·  **Tribunal/Órgão:** ...  ·  **Relator(a):** ...  ·  **Data:** ...
    - Ementa/entendimento resumido em 2-3 linhas.
    - [Fonte](URL)
- Se o trecho trouxer julgado sem número CNJ visível, coloque em subseção "Precedentes sem nº CNJ nos trechos (consultar fonte)" com o link, mas NÃO invente número.
- Em "Súmulas aplicáveis", cite apenas súmulas efetivamente encontradas nos trechos, com número + texto resumido + tribunal.
- Se nenhum julgado com número foi encontrado, diga claramente "Nenhum número de processo (CNJ) foi identificado nos resultados — refine a busca ou consulte diretamente os links das fontes". NUNCA invente ementa, número de processo, relator ou data.
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

    // Fontes com jurisprudência bem indexada no Google (evita retornar notícias)
    const domainMap: Record<string, string[]> = {
      stf: ["jurisprudencia.stf.jus.br", "portal.stf.jus.br", "jusbrasil.com.br/jurisprudencia/stf"],
      stj: ["scon.stj.jus.br", "processo.stj.jus.br", "jusbrasil.com.br/jurisprudencia/stj"],
      tst: ["jurisprudencia.tst.jus.br", "jusbrasil.com.br/jurisprudencia/tst"],
      trf: [
        "jusbrasil.com.br/jurisprudencia/trf-1",
        "jusbrasil.com.br/jurisprudencia/trf-2",
        "jusbrasil.com.br/jurisprudencia/trf-3",
        "jusbrasil.com.br/jurisprudencia/trf-4",
        "jusbrasil.com.br/jurisprudencia/trf-5",
      ],
      tj: [
        "jusbrasil.com.br/jurisprudencia/tj-sp",
        "jusbrasil.com.br/jurisprudencia/tj-rj",
        "jusbrasil.com.br/jurisprudencia/tj-mg",
        "jusbrasil.com.br/jurisprudencia/tj-rs",
        "esaj.tjsp.jus.br",
      ],
    };
    const sources = domainMap[tribunal] ?? [
      "jurisprudencia.stf.jus.br",
      "scon.stj.jus.br",
      "jurisprudencia.tst.jus.br",
      "jusbrasil.com.br/jurisprudencia",
    ];

    const siteFilter = sources.map((d) => `site:${d}`).join(" OR ");
    // 1ª tentativa: consulta focada em decisões judiciais nas fontes filtradas
    const strictQuery = `(${siteFilter}) ${query} (ementa OR acórdão OR "recurso especial" OR "apelação" OR "agravo") -noticias -imprensa -blog`;
    // 2ª tentativa (fallback): web aberta priorizando jusbrasil, com termos de decisão
    const relaxedQuery = `${query} jurisprudência (ementa OR acórdão OR "processo nº") site:jusbrasil.com.br OR site:stf.jus.br OR site:stj.jus.br OR site:tst.jus.br`;

    const tbs =
      period === "year" ? "qdr:y" :
      period === "month" ? "qdr:m" :
      undefined;

    async function runFirecrawl(q: string) {
      const res = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: q,
          limit: 10,
          lang: "pt",
          country: "br",
          ...(tbs ? { tbs } : {}),
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("Firecrawl error:", res.status, t, "query=", q);
        return [] as any[];
      }
      const j = await res.json();
      const raw: any[] =
        (Array.isArray(j?.data) ? j.data : null) ??
        (Array.isArray(j?.web) ? j.web : null) ??
        (Array.isArray(j?.data?.web) ? j.data.web : null) ??
        (Array.isArray(j?.results) ? j.results : null) ??
        [];
      console.log("Firecrawl returned", raw.length, "for:", q.slice(0, 100));
      return raw;
    }

    let rawResults = await runFirecrawl(strictQuery);
    if (rawResults.length === 0) {
      console.log("Strict query empty, retrying relaxed…");
      rawResults = await runFirecrawl(relaxedQuery);
    }

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
