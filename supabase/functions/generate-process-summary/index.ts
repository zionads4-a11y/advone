// Gera um resumo executivo (em português) das movimentações de um processo
// monitorado, usando o Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { monitored_process_id } = await req.json();
    if (!monitored_process_id) {
      return new Response(JSON.stringify({ error: "monitored_process_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: proc, error: procErr } = await sb
      .from("monitored_processes")
      .select("id, numero_cnj, client_name, classe, assunto, area, tribunal_sigla, polo_ativo, polo_passivo, status_predito, data_inicio, data_ultima_movimentacao")
      .eq("id", monitored_process_id)
      .single();
    if (procErr || !proc) throw new Error("Processo não encontrado");

    const { data: movs } = await sb
      .from("process_movements")
      .select("movement_date, movement_type, content, source_name")
      .eq("monitored_process_id", monitored_process_id)
      .order("movement_date", { ascending: false })
      .limit(80);

    if (!movs || movs.length === 0) {
      return new Response(JSON.stringify({
        summary: "Nenhuma movimentação registrada ainda. Aguardando primeira atualização da API.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const movList = movs
      .map((m: any, i: number) => {
        const d = m.movement_date ? new Date(m.movement_date).toLocaleDateString("pt-BR") : "—";
        return `${i + 1}. [${d}] ${m.movement_type || "Andamento"}: ${(m.content || "").slice(0, 400)}`;
      })
      .join("\n");

    const prompt = `Você é assistente jurídico. Resuma o estado atual deste processo para um advogado em português, de forma objetiva e prática.

DADOS DO PROCESSO
CNJ: ${proc.numero_cnj}
Cliente: ${proc.client_name}
Tribunal: ${proc.tribunal_sigla || "—"}
Classe: ${proc.classe || "—"}
Assunto: ${proc.assunto || "—"}
Área: ${proc.area || "—"}
Polo ativo: ${proc.polo_ativo || "—"}
Polo passivo: ${proc.polo_passivo || "—"}
Status predito: ${proc.status_predito || "—"}
Data de início: ${proc.data_inicio || "—"}
Última movimentação: ${proc.data_ultima_movimentacao || "—"}

MOVIMENTAÇÕES (mais recentes primeiro):
${movList}

Responda em markdown com EXATAMENTE estas seções:
**📌 Situação atual** – 1 parágrafo curto sobre em que fase o processo está.
**🕒 Últimos andamentos relevantes** – bullets com 3 a 5 itens (data + o que aconteceu, sem juridiquês).
**⚖️ Próximos passos sugeridos** – bullets com 2 a 4 ações práticas para o advogado.
**🚩 Pontos de atenção** – bullets com prazos, intimações ou riscos. Se nada relevante, escreva "Nenhum no momento".

Seja conciso. Não invente fatos que não estejam nas movimentações.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
      if (aiRes.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
      throw new Error(`AI gateway: ${aiRes.status} ${errText}`);
    }
    const aiJson = await aiRes.json();
    const summary = aiJson?.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ summary, total_movements: movs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generate-process-summary]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
