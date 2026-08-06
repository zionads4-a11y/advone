// Gera resumo em português simples para um processo consultado via Busca de Processos
// mode = "last" (última movimentação) | "decisions" (todas as decisões do processo)
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
  grau?: string;
  orgao?: string;
  is_decision?: boolean;
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
  decisoes?: Mov[];
  mode?: "last" | "decisions";
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { process: proc, movimentos = [], decisoes = [], mode = "last" } = (await req.json()) as Body;
    if (!proc?.numero_cnj) throw new Error("process.numero_cnj obrigatório");

    if (!movimentos.length) {
      return new Response(JSON.stringify({
        summary: "Este processo foi localizado no DataJud, mas ainda não há movimentações públicas registradas.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dataAju = proc.data_ajuizamento
      ? proc.data_ajuizamento.length === 14
        ? `${proc.data_ajuizamento.slice(6, 8)}/${proc.data_ajuizamento.slice(4, 6)}/${proc.data_ajuizamento.slice(0, 4)}`
        : proc.data_ajuizamento.substring(0, 10)
      : "—";

    const header = `DADOS DO PROCESSO
CNJ: ${proc.numero_cnj}
Tribunal: ${proc.tribunal ?? "—"}
Órgão julgador: ${proc.orgao ?? "—"}
Classe: ${proc.classe ?? "—"}
Assunto: ${proc.assunto ?? "—"}
Data de ajuizamento: ${dataAju}`;

    let prompt: string;

    if (mode === "decisions") {
      const decs = (decisoes.length ? decisoes : movimentos.filter((m) => m.is_decision));
      if (!decs.length) {
        return new Response(JSON.stringify({
          summary: "Não encontramos atos decisórios públicos registrados neste processo (apenas andamentos administrativos). Assim que houver decisão, sentença ou acórdão, o resumo aparecerá aqui.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Da mais antiga para a mais recente (história cronológica)
      const list = decs
        .slice(0, 60)
        .slice()
        .sort((a, b) => String(a.data ?? "").localeCompare(String(b.data ?? "")))
        .map((m, i) => `${i + 1}. [${fmt(m.data)}]${m.grau ? ` (${m.grau})` : ""} ${m.nome ?? "Decisão"}: ${(m.texto ?? "").slice(0, 600)}`)
        .join("\n");

      const contexto = movimentos
        .slice(0, 60)
        .map((m) => `- [${fmt(m.data)}] ${m.nome ?? ""}`)
        .join("\n");

      prompt = `Você é assistente jurídico brasileiro. Explique em português SIMPLES, sem juridiquês, TODAS as decisões deste processo, em ordem cronológica, como se estivesse explicando para o próprio cliente que não é advogado.

${header}

DECISÕES DO PROCESSO (ordem cronológica, da mais antiga para a mais recente):
${list}

TODOS OS ANDAMENTOS (só contexto, não explicar um a um):
${contexto}

FORMATO DA RESPOSTA (texto puro, sem markdown, sem asteriscos, sem emojis):

Resumo geral do processo:
<3 a 5 linhas contando a história do caso e onde ele está hoje, em linguagem do dia a dia>

Decisões, uma por uma:
<para cada decisão, escreva um bloco assim>
Data — o que o juiz/tribunal decidiu
Em palavras simples: <1 a 3 linhas, sem termos técnicos; se usar um termo jurídico, explique entre parênteses>
Quem saiu ganhando: <autor, réu, parcialmente cada um, ou nenhum>

Situação atual:
<1 a 3 linhas: em que fase o processo está hoje (arquivado, em recurso, aguardando etc.)>

Próximo passo esperado:
<1 a 2 linhas>

Ponto de atenção:
<prazo, recurso cabível, ou "nenhum">

REGRAS:
- Proibido juridiquês: troque "improcedente" por "o juiz negou o pedido", "trânsito em julgado" por "não cabe mais recurso", e assim por diante.
- NÃO invente fatos que não estejam no teor informado.
- Se o teor de uma decisão estiver vazio, explique o significado padrão daquele tipo de ato e diga que o teor completo não é público no DataJud.
- Sem markdown, asteriscos ou emojis.`;
    } else {
      const movList = movimentos
        .slice(0, 40)
        .map((m, i) => `${i + 1}. [${fmt(m.data)}] ${m.nome ?? "Andamento"}: ${(m.texto ?? "").slice(0, 500)}`)
        .join("\n");
      const ultima = movimentos[0] ?? {};

      prompt = `Você é assistente jurídico brasileiro. Sua tarefa é explicar em português SIMPLES o que significa a ÚLTIMA movimentação deste processo — o que aconteceu, o que isso implica na prática e qual o próximo passo esperado.

${header}

ÚLTIMA MOVIMENTAÇÃO (a que você deve explicar):
Data: ${fmt(ultima.data)}
Andamento: ${ultima.nome ?? "—"}
Teor: ${ultima.texto ?? "—"}

CONTEXTO (movimentações anteriores, só para você entender a história — NÃO explicar uma a uma):
${movList}

FORMATO DA RESPOSTA (texto puro, sem markdown, sem emojis, sem asteriscos):

Última movimentação (${fmt(ultima.data)}): <título curto do que aconteceu>

O que significa:
<2 a 4 linhas em linguagem simples>

Impacto no processo:
<1 a 2 linhas>

Próximo passo esperado:
<1 a 2 linhas>

Ponto de atenção:
<prazo, recurso cabível, ou "nenhum">

REGRAS:
- Foque APENAS na última movimentação.
- Proibido juridiquês: explique qualquer termo técnico em palavras do dia a dia.
- NÃO invente fatos que não estejam no teor.
- Sem markdown, asteriscos ou emojis.`;
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: "Você é um assistente jurídico brasileiro experiente. Escreve em português claro, simples e objetivo, sem juridiquês." },
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
    console.error("explain-process-search error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
