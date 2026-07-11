// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

const SYSTEM_PROMPT = `Você é um(a) advogado(a) sênior brasileiro(a) especializado(a) em elaboração de memórias de cálculo e pareceres jurídicos técnicos. Recebe o tipo de cálculo, os inputs fornecidos e o resultado numérico já calculado, e produz um parecer/memória de cálculo pronto(a) para juntar como peça anexa a uma petição.

Regras obrigatórias:
- Estruture a resposta em **markdown**, com as seções:
  ## Memória de Cálculo
  ## Fundamentação Legal
  ## Conclusão Técnica
  ## Recomendações Estratégicas
- Em "Memória de Cálculo", detalhe cada rubrica em bullets com a fórmula aplicada e o valor.
- Em "Fundamentação Legal", cite os dispositivos legais e súmulas pertinentes (CLT, Lei 8.213/91, EC 103/2019, CC, CDC, súmulas do TST/STJ/STF conforme o caso).
- Em "Conclusão Técnica", apresente o valor total e a tese jurídica.
- Em "Recomendações Estratégicas", oriente o(a) advogado(a) sobre próximos passos (documentos, provas, tese acessória).
- Tom formal, técnico, objetivo. Não invente valores — use apenas os fornecidos.
- Termine com o disclaimer: "_Cálculo estimativo. Confirmar índices oficiais (IPCA, TR, Selic, tabelas Bacen) na data do ajuizamento._"`;

async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(req, { error: "LOVABLE_API_KEY não configurada" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Não autenticado" }, 401);
    const accessToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(accessToken);
    if (claimsError || !claims?.claims?.sub) return json(req, { error: "Token inválido" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ok = await checkRateLimit(admin, userId, "legal-calculator-explain", 40);
    if (!ok) return json(req, { error: "Limite de uso atingido. Aguarde alguns minutos." }, 429);

    const body = await req.json();
    const tipo: string = String(body?.tipo ?? "").trim();
    const inputs = body?.inputs ?? {};
    const resultado = body?.resultado ?? {};
    if (!tipo) return json(req, { error: "Tipo de cálculo obrigatório" }, 400);

    const userMsg = `Tipo de cálculo: **${tipo}**

Dados informados:
\`\`\`json
${JSON.stringify(inputs, null, 2)}
\`\`\`

Resultado numérico já calculado pelo sistema:
\`\`\`json
${JSON.stringify(resultado, null, 2)}
\`\`\`

Produza a memória de cálculo e o parecer conforme as regras.`;

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
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      console.error("AI error:", aiRes.status, t);
      return json(req, { error: "Falha na IA", detail: t }, 502);
    }
    const aiJson = await aiRes.json();
    const parecer = aiJson?.choices?.[0]?.message?.content ?? "";
    return json(req, { parecer }, 200);
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
