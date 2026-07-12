// Laura — modo cliente existente.
// Recebe uma mensagem, identifica o cliente por nome+CPF, roteia por área/advogado,
// consulta status de processo monitorado e grava tudo em client_conversation_messages.
//
// Chamado pelo zapi-webhook quando o número já pertence a um lead is_client=true,
// e também pode ser chamado manualmente para simulação.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion, type ChatMessage } from "../_shared/aiClient.ts";

interface RouterRequest {
  company_id: string;
  client_lead_id?: string | null;    // se já conhecido
  phone?: string;                     // fallback para identificação
  message: string;
  channel?: "whatsapp" | "manual";
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "identify_client",
      description:
        "Identifica um cliente do escritório pelo nome completo e CPF. Use apenas quando não foi passado client_lead_id no contexto.",
      parameters: {
        type: "object",
        properties: {
          nome_completo: { type: "string", description: "Nome completo dito pelo cliente." },
          cpf: { type: "string", description: "CPF apenas dígitos." },
        },
        required: ["nome_completo", "cpf"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_process_status",
      description:
        "Consulta o status atual dos processos monitorados do cliente. Retorna a última movimentação em cada um, ou informa que não há processo monitorado.",
      parameters: {
        type: "object",
        properties: { client_lead_id: { type: "string" } },
        required: ["client_lead_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_lawyer",
      description:
        "Encaminha a conversa para um advogado específico solicitado pelo cliente (mesmo que não seja o responsável pelo processo).",
      parameters: {
        type: "object",
        properties: {
          client_lead_id: { type: "string" },
          nome_advogado: { type: "string" },
        },
        required: ["client_lead_id", "nome_advogado"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "route_to_sector",
      description:
        "Encaminha a conversa para a área jurídica correspondente ao assunto (Trabalhista, Previdenciário, Cível, etc.). Use quando o cliente quer falar sobre um caso novo ou fora da área do processo dele.",
      parameters: {
        type: "object",
        properties: {
          client_lead_id: { type: "string" },
          nome_area: { type: "string" },
          assunto: { type: "string" },
        },
        required: ["client_lead_id", "nome_area", "assunto"],
      },
    },
  },
];

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: RouterRequest = await req.json();
    if (!body.company_id || !body.message) {
      return new Response(
        JSON.stringify({ error: "company_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Se não veio client_lead_id, tenta achar por telefone
    let clientLeadId = body.client_lead_id ?? null;
    if (!clientLeadId && body.phone) {
      const clean = onlyDigits(body.phone);
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", body.company_id)
        .eq("is_client", true)
        .or(`phone.eq.${clean},whatsapp.eq.${clean}`)
        .maybeSingle();
      clientLeadId = data?.id ?? null;
    }

    // 2) Recupera/cria conversa ativa
    let conversation: any = null;
    if (clientLeadId) {
      const { data: activeConv } = await supabase
        .from("client_conversations")
        .select("*")
        .eq("company_id", body.company_id)
        .eq("client_lead_id", clientLeadId)
        .eq("status", "active")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      conversation = activeConv;
    }

    // 3) Persiste mensagem de entrada (se já tiver conversa)
    if (conversation) {
      await supabase.from("client_conversation_messages").insert({
        conversation_id: conversation.id,
        company_id: body.company_id,
        direction: "in",
        sender_type: "client",
        content: body.message,
      });
    }

    // 4) Prepara contexto para Laura
    const { data: company } = await supabase
      .from("companies")
      .select("name, timezone")
      .eq("id", body.company_id)
      .maybeSingle();

    let clientContext = "";
    if (clientLeadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, cpf_cliente_final, phone")
        .eq("id", clientLeadId)
        .maybeSingle();
      clientContext = `\n\nCliente já identificado no sistema:
- ID interno: ${clientLeadId}
- Nome: ${lead?.name ?? "?"}
- CPF: ${lead?.cpf_cliente_final ?? "?"}
Você NÃO precisa perguntar nome/CPF de novo. Vá direto ao ponto: pergunte como pode ajudar.`;
    } else {
      clientContext = `\n\nO cliente AINDA NÃO foi identificado. Peça, de forma natural (não como formulário), o nome completo e o CPF, e chame a tool identify_client.`;
    }

    // 5) Recupera histórico curto
    const history: ChatMessage[] = [];
    if (conversation) {
      const { data: prevMsgs } = await supabase
        .from("client_conversation_messages")
        .select("direction, sender_type, content")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(30);
      (prevMsgs ?? []).forEach((m: any) => {
        if (!m.content) return;
        history.push({
          role: m.direction === "in" ? "user" : "assistant",
          content: m.content,
        });
      });
    }
    // A mensagem atual (caso ainda não tenha conversa e portanto não foi persistida ainda)
    if (!conversation) {
      history.push({ role: "user", content: body.message });
    }

    const systemPrompt = `Você é a Laura, atendente virtual do escritório ${company?.name ?? ""}.
Você está atendendo um CLIENTE JÁ EXISTENTE do escritório (não é um lead novo).

REGRAS RÍGIDAS:
- NUNCA use menus numerados ("digite 1", "digite 2"), URA ou emojis de número. TUDO conversacional.
- Fale como humano: frases curtas, empatia, primeiro nome quando souber.
- Nunca diga "vou consultar o sistema" — diga "só um instante" e chame as tools em silêncio.
- Se o cliente pedir para falar com um advogado específico (ex: "quero falar com o Dr. Pedro"), SEMPRE chame request_lawyer, mesmo que ele não seja o responsável pelo processo.
- Se o cliente quiser saber do processo dele, chame get_process_status. Se não tiver processo monitorado, informe o horário de atendimento e direcione para atendimento humano via route_to_sector.
- Se o cliente citar uma área diferente (ex: cliente trabalhista falando de previdenciário), chame route_to_sector para a área correta.
${clientContext}`;

    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...history];

    // 6) Loop de tool-calling
    let assistantText = "";
    let toolCallsSeen: any[] = [];
    for (let step = 0; step < 5; step++) {
      const res = await chatCompletion({
        companyId: body.company_id,
        messages,
        tools: TOOLS,
        stream: false,
      });
      const choice = res?.choices?.[0]?.message;
      if (!choice) break;
      const toolCalls = choice.tool_calls || [];
      if (!toolCalls.length) {
        assistantText = choice.content || "";
        break;
      }
      messages.push({ role: "assistant", content: choice.content ?? "", tool_calls: toolCalls });
      for (const tc of toolCalls) {
        toolCallsSeen.push(tc);
        const name = tc.function?.name;
        const args = JSON.parse(tc.function?.arguments || "{}");
        let toolResult: any = { ok: false };

        try {
          if (name === "identify_client") {
            const cpf = onlyDigits(args.cpf || "");
            const { data } = await supabase
              .from("leads")
              .select("id, name, cpf_cliente_final, assigned_to, area_direito, case_area")
              .eq("company_id", body.company_id)
              .eq("is_client", true)
              .eq("cpf_cliente_final", cpf)
              .maybeSingle();
            if (data) {
              clientLeadId = data.id;
              toolResult = {
                ok: true,
                client_lead_id: data.id,
                nome: data.name,
                area_do_cliente: data.area_direito || data.case_area || null,
              };
            } else {
              toolResult = { ok: false, reason: "not_found" };
            }
          } else if (name === "get_process_status") {
            const cid = args.client_lead_id || clientLeadId;
            const { data: procs } = await supabase
              .from("monitored_processes")
              .select("numero_cnj, last_movement_text, last_movement_date, situacao")
              .eq("company_id", body.company_id)
              .eq("lead_id", cid);
            if (!procs?.length) {
              toolResult = { ok: true, monitored: false };
            } else {
              toolResult = { ok: true, monitored: true, processos: procs };
            }
          } else if (name === "request_lawyer") {
            const cid = args.client_lead_id || clientLeadId;
            const nome = (args.nome_advogado || "").toLowerCase();
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name");
            const match = (profiles || []).find((p: any) =>
              p.full_name?.toLowerCase().includes(nome.replace(/dr\.?\s*|dra\.?\s*/g, "").trim()),
            );
            if (!match) {
              toolResult = { ok: false, reason: "lawyer_not_found" };
            } else {
              await ensureConversation(supabase, {
                company_id: body.company_id,
                client_lead_id: cid,
                assigned_lawyer_id: match.user_id,
                subject: `Cliente solicitou ${match.full_name}`,
              });
              toolResult = { ok: true, encaminhado_para: match.full_name };
            }
          } else if (name === "route_to_sector") {
            const cid = args.client_lead_id || clientLeadId;
            const areaName = (args.nome_area || "").toLowerCase();
            const { data: areas } = await supabase
              .from("legal_areas")
              .select("id, name")
              .eq("company_id", body.company_id)
              .eq("is_active", true);
            const area = (areas || []).find((a: any) => a.name.toLowerCase().includes(areaName));
            await ensureConversation(supabase, {
              company_id: body.company_id,
              client_lead_id: cid,
              legal_area_id: area?.id ?? null,
              subject: args.assunto || null,
            });
            toolResult = { ok: true, area: area?.name ?? areaName };
          }
        } catch (e) {
          toolResult = { ok: false, error: (e as Error).message };
        }

        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          name,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // 7) Garante que temos conversa (mesmo que tools não tenham sido chamadas)
    if (clientLeadId && !conversation) {
      conversation = await ensureConversation(supabase, {
        company_id: body.company_id,
        client_lead_id: clientLeadId,
      });
      // Grava a mensagem original agora que temos conversa
      await supabase.from("client_conversation_messages").insert({
        conversation_id: conversation.id,
        company_id: body.company_id,
        direction: "in",
        sender_type: "client",
        content: body.message,
      });
    }

    // 8) Grava resposta da Laura + dispara no WhatsApp
    if (conversation && assistantText) {
      await supabase.from("client_conversation_messages").insert({
        conversation_id: conversation.id,
        company_id: body.company_id,
        direction: "out",
        sender_type: "laura",
        content: assistantText,
      });

      // Envia no WhatsApp do cliente (só quando o canal é WhatsApp)
      if ((body.channel ?? "whatsapp") === "whatsapp" && clientLeadId) {
        try {
          const { data: leadRow } = await supabase
            .from("leads")
            .select("phone, whatsapp")
            .eq("id", clientLeadId)
            .maybeSingle();
          const phone = leadRow?.whatsapp || leadRow?.phone || body.phone;
          if (phone) {
            await supabase.functions.invoke("send-whatsapp", {
              body: { company_id: body.company_id, phone, message: assistantText },
            });
          }
        } catch (e) {
          console.error("[laura-client-router] send-whatsapp failed:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        conversation_id: conversation?.id ?? null,
        client_lead_id: clientLeadId,
        reply: assistantText,
        tool_calls: toolCallsSeen.map((t) => t.function?.name),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[laura-client-router] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function ensureConversation(
  supabase: any,
  opts: {
    company_id: string;
    client_lead_id: string;
    legal_area_id?: string | null;
    assigned_lawyer_id?: string | null;
    subject?: string | null;
  },
) {
  const { data: existing } = await supabase
    .from("client_conversations")
    .select("*")
    .eq("company_id", opts.company_id)
    .eq("client_lead_id", opts.client_lead_id)
    .eq("status", "active")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const patch: any = {};
    if (opts.legal_area_id && !existing.legal_area_id) patch.legal_area_id = opts.legal_area_id;
    if (opts.assigned_lawyer_id) patch.assigned_lawyer_id = opts.assigned_lawyer_id;
    if (opts.subject && !existing.subject) patch.subject = opts.subject;
    if (Object.keys(patch).length) {
      const { data: upd } = await supabase
        .from("client_conversations")
        .update(patch)
        .eq("id", existing.id)
        .select("*")
        .single();
      return upd;
    }
    return existing;
  }

  // Se não veio área, tenta inferir do lead
  let areaId = opts.legal_area_id ?? null;
  if (!areaId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("area_direito, case_area")
      .eq("id", opts.client_lead_id)
      .maybeSingle();
    const hint = (lead?.area_direito || lead?.case_area || "").toLowerCase();
    if (hint) {
      const { data: areas } = await supabase
        .from("legal_areas")
        .select("id, name")
        .eq("company_id", opts.company_id)
        .eq("is_active", true);
      const match = (areas || []).find((a: any) => a.name.toLowerCase().includes(hint) || hint.includes(a.name.toLowerCase()));
      areaId = match?.id ?? null;
    }
  }

  const { data: created } = await supabase
    .from("client_conversations")
    .insert({
      company_id: opts.company_id,
      client_lead_id: opts.client_lead_id,
      legal_area_id: areaId,
      assigned_lawyer_id: opts.assigned_lawyer_id ?? null,
      subject: opts.subject ?? null,
      source: "whatsapp",
      status: "active",
    })
    .select("*")
    .single();
  return created;
}
