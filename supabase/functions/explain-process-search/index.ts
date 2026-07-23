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

    const ultima = movimentos[0] ?? {};
    const dataUltima = ultima.data ? new Date(ultima.data).toLocaleDateString("pt-BR") : "—";

    const prompt = `Você é assistente jurídico brasileiro. Sua tarefa é explicar em português SIMPLES o que significa a ÚLTIMA movimentação deste processo — o que aconteceu, o que isso implica na prática e qual o próximo passo esperado.

DADOS DO PROCESSO
CNJ: ${proc.numero_cnj}
Tribunal: ${proc.tribunal ?? "—"}
Órgão julgador: ${proc.orgao ?? "—"}
Classe: ${proc.classe ?? "—"}
Assunto: ${proc.assunto ?? "—"}
Data de ajuizamento: ${dataAju}

ÚLTIMA MOVIMENTAÇÃO (a que você deve explicar):
Data: ${dataUltima}
Andamento: ${ultima.nome ?? "—"}
Teor: ${ultima.texto ?? "—"}

CONTEXTO (movimentações anteriores, só para você entender a história — NÃO explicar uma a uma):
${movList}

FORMATO DA RESPOSTA (texto puro, sem markdown, sem emojis, sem asteriscos):

Última movimentação (${dataUltima}): <título curto do que aconteceu>

O que significa:
<2 a 4 linhas explicando em linguagem simples o que essa movimentação quer dizer na prática, como se estivesse explicando para o cliente>

Impacto no processo:
<1 a 2 linhas: o que muda para as partes; se encerra o processo, abre prazo, marca audiência, etc.>

Próximo passo esperado:
<1 a 2 linhas: o que provavelmente vem a seguir, ou "aguardar" se o processo estiver arquivado/transitado em julgado>

Ponto de atenção:
<prazo, recurso cabível, ou "nenhum" se não houver>

REGRAS:
- Foque APENAS na última movimentação.
- NÃO invente fatos que não estejam no teor.
- NÃO use markdown, asteriscos ou emojis.
- Se o teor estiver vazio, use o nome do andamento para explicar o significado padrão daquele tipo de ato.`;

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
