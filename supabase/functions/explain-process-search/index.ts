// Gera resumo em português simples para um processo consultado via Busca de Processos
// (sem exigir que o processo esteja salvo no monitoramento).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Mov {
  data?: string;
  codigo?: number;
  nome?: string;
  texto?: string;
}

interface Body {
  process: {
    numero_cnj?: string;
    classe?: string;
    assunto?: string;
    tribunal?: string;
    orgao?: string;
    data_ajuizamento?: string;
    grau?: string;
  };
  movimentos: Mov[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: claims } = await sb.auth.getClaims(token);
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { process: proc, movimentos = [] } = (await req.json()) as Body;
    if (!proc?.numero_cnj) throw new Error("process.numero_cnj obrigatório");

    if (!movimentos.length) {
      return new Response(JSON.stringify({
        summary: "Este processo foi localizado no DataJud, mas ainda não há movimentações públicas registradas.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const movList = movimentos
      .slice(0, 40)
      .map((m, i) => {
        const d = m.data ? new Date(m.data).toLocaleDateString("pt-BR") : "—";
        return `${i + 1}. [${d}] ${m.nome ?? "Andamento"}: ${(m.texto ?? "").slice(0, 500)}`;
      })
      .join("\n");

    const dataAju = proc.data_ajuizamento
      ? proc.data_ajuizamento.length === 14
        // formato "YYYYMMDDhhmmss"
        ? `${proc.data_ajuizamento.slice(6, 8)}/${proc.data_ajuizamento.slice(4, 6)}/${proc.data_ajuizamento.slice(0, 4)}`
        : proc.data_ajuizamento.substring(0, 10)
      : "—";

    const prompt = `Você é assistente jurídico brasileiro. Explique este processo em português SIMPLES (sem juridiquês), para o advogado entender rapidamente o que está acontecendo hoje.

DADOS DO PROCESSO
CNJ: ${proc.numero_cnj}
Tribunal: ${proc.tribunal ?? "—"}
Órgão julgador: ${proc.orgao ?? "—"}
Classe: ${proc.classe ?? "—"}
Assunto: ${proc.assunto ?? "—"}
Grau: ${proc.grau ?? "—"}
Data de ajuizamento: ${dataAju}

MOVIMENTAÇÕES (mais recentes primeiro):
${movList}

FORMATO DA RESPOSTA (texto puro, sem markdown, sem emojis):

Resumo do processo ${proc.numero_cnj}:

- Trata-se de: <classe/assunto em linguagem simples>
- Onde tramita: <órgão / tribunal>
- Ajuizado em: ${dataAju}
- Fase atual: <em que ponto o processo está hoje, com base nas últimas movimentações>
- Próximo passo esperado: <o que provavelmente acontece a seguir>
- Pontos de atenção: <prazos, audiências, decisões — ou "nenhum evidente">

Últimas movimentações explicadas:

1. Data: DD/MM/AAAA - <explicação em 1-2 linhas do que aconteceu>
2. Data: DD/MM/AAAA - <explicação...>
(liste as 5 a 8 mais recentes)

REGRAS:
- NÃO invente fatos que não estejam nas movimentações.
- NÃO use markdown (nada de **, ##, *).
- Linguagem clara, como se explicasse para o cliente.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um assistente jurídico brasileiro experiente. Escreve em português claro e objetivo." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns instantes.");
      if (aiRes.status === 402) throw new Error("Créditos da IA esgotados.");
      throw new Error(`AI gateway ${aiRes.status}: ${errText.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const summary = aiJson?.choices?.[0]?.message?.content ?? "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[explain-process-search]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
