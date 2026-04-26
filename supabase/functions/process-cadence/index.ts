import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";
import {
  CADENCE_MESSAGES,
  INACTIVITY_NUDGES,
  MAX_CADENCE_ATTEMPTS,
  detectOpenTopic,
  extractOpenQuestion,
  renderTopicFallback,
  isTooSimilar,
  type OpenTopic,
} from "./_logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────────────────────
// Validador de repetição (pré-filtro Jaccard + IA quando duvidoso)
// ─────────────────────────────────────────────────────────────
async function isRepetitiveByAI(candidate: string, previousMessages: string[]): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || previousMessages.length === 0) return false;
  try {
    const previousList = previousMessages.slice(0, 5).map((m, i) => `${i + 1}) ${m}`).join("\n");
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um validador. Responda SOMENTE com 'SIM' ou 'NAO'. Diga SIM se a mensagem candidata for muito parecida (mesma intenção, mesma pergunta, mesma estrutura) com alguma das tentativas anteriores. Diga NAO se ela trouxer ângulo, pergunta ou tom claramente diferente." },
          { role: "user", content: `CANDIDATA:\n${candidate}\n\nTENTATIVAS ANTERIORES:\n${previousList}\n\nÉ muito parecida?` },
        ],
      }),
    });
    if (!resp.ok) return false;
    const j = await resp.json();
    const reply = (j.choices?.[0]?.message?.content || "").trim().toUpperCase();
    return reply.startsWith("SIM");
  } catch (err) {
    console.error("isRepetitiveByAI error:", err);
    return false;
  }
}

async function checkRepetition(
  candidate: string,
  previousMessages: string[],
): Promise<"allowed" | "blocked_identical" | "blocked_similar"> {
  if (previousMessages.length === 0) return "allowed";
  for (const prev of previousMessages) {
    if (isTooSimilar(candidate, prev, 0.85)) return "blocked_identical";
  }
  let needsAi = false;
  for (const prev of previousMessages) {
    if (isTooSimilar(candidate, prev, 0.5)) { needsAi = true; break; }
  }
  if (needsAi) {
    const repetitive = await isRepetitiveByAI(candidate, previousMessages);
    if (repetitive) return "blocked_similar";
  }
  return "allowed";
}

async function loadConversationState(
  supabase: any,
  leadId: string,
  lastBotMessage: string | null,
): Promise<{ topic: OpenTopic; openQuestion: string | null; previousFollowups: string[] }> {
  const { data: lastAudit } = await supabase
    .from("ai_followup_audit")
    .select("message_sent")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(10);
  const previousFollowups = (lastAudit || []).map((r: any) => r.message_sent).filter(Boolean);
  return {
    topic: detectOpenTopic(lastBotMessage),
    openQuestion: extractOpenQuestion(lastBotMessage),
    previousFollowups,
  };
}

async function recordFollowupAudit(supabase: any, params: {
  companyId: string; leadId: string; phone: string;
  topic: OpenTopic; openQuestion: string | null;
  messageSent: string; source: string; triggerKind: string;
  inactiveMinutes: number; repetitionCheck: string;
}) {
  await supabase.from("ai_followup_audit").insert({
    company_id: params.companyId,
    lead_id: params.leadId,
    phone: params.phone,
    open_topic: params.topic,
    open_question: params.openQuestion,
    message_sent: params.messageSent,
    source: params.source,
    trigger_kind: params.triggerKind,
    inactive_minutes: params.inactiveMinutes,
    repetition_check: params.repetitionCheck,
  });
}

async function sendWhatsAppMessage(
  config: any,
  phone: string,
  text: string
): Promise<any> {
  const SERVER_URL = "https://ziondigital.uazapi.com";
  const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ADMIN_TOKEN) headers["admintoken"] = ADMIN_TOKEN;

  const instanceParam = encodeURIComponent(config.zapi_instance_id);
  const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id);
  const sendUrl = `${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`;

  const response = await fetch(sendUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ number: phone, text }),
  });

  if (response.ok) {
    return await response.json();
  }
  console.error("Send failed:", response.status, await response.text());
  return null;
}

// ─────────────────────────────────────────────────────────────
// Sugestão de horários alternativos (BRT) — para nudges de schedule_time
// ─────────────────────────────────────────────────────────────
const WEEKDAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nowBRT(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")));
}

/**
 * Detecta preferência de período a partir do histórico do lead.
 * Olha as últimas mensagens INCOMING (do lead) procurando manhã/tarde/noite.
 */
function detectPeriodPreference(history: string): "morning" | "afternoon" | "evening" | null {
  // Pega só as linhas do Lead
  const leadLines = history
    .split("\n")
    .filter((l) => l.toLowerCase().startsWith("lead:"))
    .join(" ")
    .toLowerCase();

  if (!leadLines) return null;

  // Prioridade: o que apareceu mais recente conta mais — varremos as últimas 3 falas do lead
  const recentLeadLines = history
    .split("\n")
    .filter((l) => l.toLowerCase().startsWith("lead:"))
    .slice(-3)
    .join(" ")
    .toLowerCase();

  if (/\b(tarde|à tarde|de tarde|pela tarde|depois do almoço|depois das? 13|depois das? 14)\b/.test(recentLeadLines)) {
    return "afternoon";
  }
  if (/\b(manh[ãa]|de manh[ãa]|pela manh[ãa]|cedo|antes do almoço|antes das? 12)\b/.test(recentLeadLines)) {
    return "morning";
  }
  if (/\b(noite|à noite|de noite|fim do dia|final do dia|depois das? 18)\b/.test(recentLeadLines)) {
    return "evening";
  }
  return null;
}

/**
 * Retorna o PRIMEIRO horário disponível na agenda respeitando o período preferido.
 * Varre os próximos 5 dias úteis em ordem; dentro de cada dia, pega o primeiro slot livre
 * que cair no período. Se não houver preferência, devolve o primeiro slot do próximo dia útil.
 */
async function findFirstAvailableSlot(
  supabase: any,
  companyId: string,
  period: "morning" | "afternoon" | "evening" | null,
): Promise<{ weekday: string; date: string; time: string } | null> {
  const { data: company } = await supabase.from("companies").select("business_hours").eq("id", companyId).maybeSingle();
  const businessHours: Record<string, { open: string; close: string }[]> = company?.business_hours || {};

  const now = nowBRT();

  for (let offset = 1; offset <= 7; offset++) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() + offset);
    const dow = day.getUTCDay();
    const key = WEEKDAY_KEYS[dow];
    const windows = businessHours[key] || [];
    if (!windows.length) continue;

    const dd = String(day.getUTCDate()).padStart(2, "0");
    const mm = String(day.getUTCMonth() + 1).padStart(2, "0");
    const dateStr = `${dd}/${mm}`;
    const dateISO = `${day.getUTCFullYear()}-${mm}-${dd}`;

    const dayStart = new Date(`${dateISO}T00:00:00-03:00`);
    const dayEnd = new Date(`${dateISO}T23:59:59-03:00`);
    const { data: booked } = await supabase
      .from("lead_reminders")
      .select("due_at")
      .eq("company_id", companyId)
      .eq("reminder_type", "meeting")
      .gte("due_at", dayStart.toISOString())
      .lte("due_at", dayEnd.toISOString());

    const bookedTimes = new Set<string>();
    for (const b of (booked || []) as { due_at: string }[]) {
      const dt = new Date(b.due_at);
      const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });
      bookedTimes.add(fmt.format(dt));
    }

    for (const w of windows) {
      const [openH, openM] = w.open.split(":").map(Number);
      const [closeH] = w.close.split(":").map(Number);
      for (let h = openH; h < closeH; h++) {
        // Filtro de período
        if (period === "morning" && h >= 12) continue;
        if (period === "afternoon" && (h < 13 || h >= 18)) continue;
        if (period === "evening" && h < 18) continue;

        const time = `${String(h).padStart(2, "0")}:${String(openM || 0).padStart(2, "0")}`;
        if (bookedTimes.has(time)) continue;

        return { weekday: WEEKDAY_NAMES[dow], date: dateStr, time };
      }
    }
  }
  return null;
}

async function generateContextualNudge(
  supabase: any,
  companyId: string,
  phone: string,
  leadName: string,
  attemptNumber: number,
  aiPrompt: string,
  tone: string,
  topic: OpenTopic,
  openQuestion: string | null,
  previousFollowups: string[],
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const { data: convMsgs } = await supabase
    .from("whatsapp_messages")
    .select("message_text, direction, sender_name, timestamp")
    .eq("company_id", companyId)
    .eq("phone", phone)
    .order("timestamp", { ascending: false })
    .limit(30);

  const history = (convMsgs || []).reverse().map((m: any) =>
    `${m.direction === "incoming" ? "Lead" : (m.sender_name || "Atendente")}: ${m.message_text || ""}`
  ).join("\n");

  if (!history.trim()) return null;

  const previousBlock = previousFollowups.length > 0
    ? `\n\n⛔ TENTATIVAS DE RETOMADA JÁ ENVIADAS (NÃO REPETIR — varie ângulo e palavras):\n${previousFollowups.slice(0, 5).map((m, i) => `${i + 1}. ${m}`).join("\n")}`
    : "";

  const topicHint = openQuestion
    ? `\n\n🎯 ASSUNTO EM ABERTO (tópico: ${topic}): "${openQuestion}"\nRetome ESTE ponto especificamente.`
    : `\n\n🎯 TÓPICO EM ABERTO: ${topic}.`;

  // Quando o tópico em aberto é horário, buscamos o PRIMEIRO horário disponível
  // respeitando a preferência (manhã/tarde) já manifestada pelo lead no histórico.
  let alternativeSlotsHint = "";
  if (topic === "schedule_time") {
    const period = detectPeriodPreference(history);
    const slot = await findFirstAvailableSlot(supabase, companyId, period);
    if (slot) {
      const periodLabel =
        period === "morning" ? "manhã (lead disse que prefere manhã)"
        : period === "afternoon" ? "tarde (lead disse que prefere tarde)"
        : period === "evening" ? "fim do dia (lead disse que prefere noite)"
        : "primeiro horário útil disponível";
      alternativeSlotsHint = `\n\n📅 PRÓXIMO HORÁRIO DISPONÍVEL NA AGENDA (BRT) — período: ${periodLabel}:\n👉 ${slot.weekday}, ${slot.date} às ${slot.time}\n\nOFEREÇA EXATAMENTE ESSE HORÁRIO. Não invente outro, não liste opções — proponha ESSE como sugestão concreta e pergunte se serve.`;
    }
  }


  const system = `${aiPrompt || "Você é uma atendente virtual de um escritório de advocacia."}

═══════════════════════════════════════
🔄 CONTEXTO: NUDGE DE INATIVIDADE (${attemptNumber}/4)
═══════════════════════════════════════
O lead parou de responder há um tempo. Você precisa retomar a conversa de forma INTELIGENTE — não basta repetir a pergunta.

REGRAS OBRIGATÓRIAS:
1. LEIA TODA a conversa abaixo do começo ao fim — entenda o contexto, o caso, e principalmente as PREFERÊNCIAS já manifestadas (período do dia, modalidade, unidade)
2. Continue de ONDE PAROU — natural, humano, sem soar robô
3. NÃO se reapresente, NÃO repita perguntas idênticas já feitas, NÃO mande "olá novamente"
4. 🎯 SE VOCÊ JÁ OFERECEU UM HORÁRIO E O LEAD NÃO RESPONDEU: NÃO repita o mesmo horário. PROPONHA UM NOVO horário alternativo baseado na preferência dele (se mencionou tarde/manhã, respeite)
5. Se você perguntou algo concreto (horário, modalidade, dado) e ele não respondeu, faça de forma diferente — ofereça uma alternativa concreta ao invés de só re-perguntar
6. Tom: ${tone || "profissional e acolhedor"}. Curto (1-3 linhas).
7. Use o nome se possível: "${leadName || ""}"
8. Responda APENAS com o texto da mensagem, sem aspas, sem JSON, sem explicação${topicHint}${alternativeSlotsHint}${previousBlock}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Histórico:\n\n${history}\n\n---\nGere a próxima mensagem de retomada continuando de onde parou.` },
        ],
      }),
    });
    if (!resp.ok) return null;
    const j = await resp.json();
    const txt = (j.choices?.[0]?.message?.content || "").trim();
    return txt.replace(/^["'`]+|["'`]+$/g, "").trim() || null;
  } catch (e) {
    console.error("Nudge AI error:", e);
    return null;
  }
}

async function processInactivityNudges(supabase: any) {
  let nudgesSent = 0;

  // Get all companies with AI enabled
  const { data: configs } = await supabase
    .from("whatsapp_configs")
    .select("company_id, zapi_instance_id, zapi_token, ai_enabled, ai_auto_reply, ai_prompt, communication_tone")
    .eq("ai_enabled", true)
    .eq("ai_auto_reply", true);

  if (!configs || configs.length === 0) return nudgesSent;

  for (const config of configs) {
    try {
      // Find leads in active conversation (status = contacted, bot not disabled)
      const { data: activeLeads } = await supabase
        .from("leads")
        .select("id, phone, whatsapp, name, bot_disabled")
        .eq("company_id", config.company_id)
        .eq("status", "contacted")
        .eq("bot_disabled", false);

      if (!activeLeads || activeLeads.length === 0) continue;

      for (const lead of activeLeads) {
        const phone = lead.whatsapp || lead.phone;
        if (!phone) continue;

        // Get the last 2 messages for this conversation
        const { data: lastMessages } = await supabase
          .from("whatsapp_messages")
          .select("direction, timestamp, sender_name")
          .eq("company_id", config.company_id)
          .eq("phone", phone)
          .order("timestamp", { ascending: false })
          .limit(2);

        if (!lastMessages || lastMessages.length === 0) continue;

        const lastMsg = lastMessages[0];

        // Only nudge if last message was OUTGOING (bot/IA sent, lead didn't reply)
        if (lastMsg.direction !== "outgoing") continue;

        // Don't nudge if last message was already a nudge
        if (lastMsg.sender_name === "Nudge") continue;

        const lastMsgTime = new Date(lastMsg.timestamp).getTime();
        const now = Date.now();
        const minutesSinceLastMsg = (now - lastMsgTime) / (1000 * 60);

        // Count how many nudges were already sent for this conversation today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: nudgesSentToday } = await supabase
          .from("whatsapp_messages")
          .select("id, timestamp")
          .eq("company_id", config.company_id)
          .eq("phone", phone)
          .eq("sender_name", "Nudge")
          .gte("timestamp", todayStart.toISOString())
          .order("timestamp", { ascending: false });

        const nudgeCount = nudgesSentToday?.length || 0;

        // Already sent all 4 nudges today — stop
        if (nudgeCount >= INACTIVITY_NUDGES.length) continue;

        // Find the next nudge to send based on time elapsed
        const nextNudge = INACTIVITY_NUDGES[nudgeCount];
        if (!nextNudge) continue;

        // Check if enough time has passed for this nudge level
        if (minutesSinceLastMsg < nextNudge.minutesAfter) continue;

        // Also check that we haven't sent a nudge in the last 25 minutes (avoid spam)
        if (nudgesSentToday && nudgesSentToday.length > 0) {
          const lastNudgeTime = new Date(nudgesSentToday[0].timestamp).getTime();
          const minutesSinceLastNudge = (now - lastNudgeTime) / (1000 * 60);
          if (minutesSinceLastNudge < 25) continue;
        }

        // Carrega estado da conversa (tópico, pergunta em aberto, follow-ups anteriores)
        const lastBotText = lastMsg && lastMsg.direction === "outgoing"
          ? (await supabase
              .from("whatsapp_messages")
              .select("message_text")
              .eq("company_id", config.company_id)
              .eq("phone", phone)
              .eq("direction", "outgoing")
              .order("timestamp", { ascending: false })
              .limit(1)
              .maybeSingle()).data?.message_text || null
          : null;

        const state = await loadConversationState(supabase, lead.id, lastBotText);

        // 1. Tenta gerar via IA contextualizada
        let nudgeText = await generateContextualNudge(
          supabase,
          config.company_id,
          phone,
          lead.name || "",
          nudgeCount + 1,
          (config as any).ai_prompt || "",
          (config as any).communication_tone || "",
          state.topic,
          state.openQuestion,
          state.previousFollowups,
        );
        let source = nudgeText ? "ai" : "";
        let repetitionCheck: "allowed" | "blocked_identical" | "blocked_similar" = "allowed";

        // 2. Validador de repetição: se IA gerou algo muito parecido, descarta e usa fallback por tópico
        if (nudgeText) {
          repetitionCheck = await checkRepetition(nudgeText, state.previousFollowups);
          if (repetitionCheck !== "allowed") {
            console.log(`Nudge IA descartado (${repetitionCheck}) → fallback por tópico ${state.topic}`);
            nudgeText = renderTopicFallback(state.topic, lead.name || "");
            source = "template_fallback_topic";
          }
        }

        // 3. Fallback final: por tópico (não a mensagem genérica antiga)
        if (!nudgeText) {
          nudgeText = renderTopicFallback(state.topic, lead.name || "");
          source = "template_fallback_topic";
          // Se ainda assim ficar vazio (não deveria), cai no antigo
          if (!nudgeText) {
            nudgeText = nextNudge.message.replace(/\{nome\}/g, lead.name || "");
            source = "template_fallback_default";
          }
        }

        const result = await sendWhatsAppMessage(config, phone, nudgeText);

        if (result) {
          await supabase.from("whatsapp_messages").insert({
            company_id: config.company_id,
            lead_id: lead.id,
            phone,
            message_text: nudgeText,
            direction: "outgoing",
            sender_name: "Nudge",
            message_id_external: result.messageId || result.key?.id || null,
            timestamp: new Date().toISOString(),
          });

          await recordFollowupAudit(supabase, {
            companyId: config.company_id,
            leadId: lead.id,
            phone,
            topic: state.topic,
            openQuestion: state.openQuestion,
            messageSent: nudgeText,
            source,
            triggerKind: `nudge_${nextNudge.minutesAfter}m`,
            inactiveMinutes: Math.round(minutesSinceLastMsg),
            repetitionCheck,
          });

          console.log(`Nudge ${nudgeCount + 1}/4 [${source}] sent to ${phone} (${minutesSinceLastMsg.toFixed(0)}min, topic=${state.topic})`);
          nudgesSent++;
        }
      }
    } catch (err) {
      console.error("Inactivity nudge error for company:", config.company_id, err);
    }
  }

  return nudgesSent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== PART 1: Process scheduled cadence messages ==========
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("cadence_messages")
      .select("id, company_id, lead_id, phone, day_number, message_text, scheduled_at")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error("Error fetching cadence messages:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;

    for (const msg of (pendingMessages || [])) {
      try {
        // Regra: a cadência é válida se o lead NÃO respondeu desde a última
        // mensagem do bot. Se ele já respondeu (depois da última outgoing), pula
        // essa cadência — provavelmente o webhook já reagendou uma nova.
        const { data: lastOutgoing } = await supabase
          .from("whatsapp_messages")
          .select("timestamp")
          .eq("company_id", msg.company_id)
          .eq("phone", msg.phone)
          .eq("direction", "outgoing")
          .order("timestamp", { ascending: false })
          .limit(1)
          .maybeSingle();

        const referenceTs = lastOutgoing?.timestamp || msg.scheduled_at;

        const { data: replyAfterLastBot } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("company_id", msg.company_id)
          .eq("phone", msg.phone)
          .eq("direction", "incoming")
          .gt("timestamp", referenceTs)
          .limit(1);

        if (replyAfterLastBot && replyAfterLastBot.length > 0) {
          // Lead já respondeu depois da última msg do bot → cancela esta cadência.
          // O webhook já cuidou de reagendar uma nova baseada na próxima resposta do bot.
          await supabase
            .from("cadence_messages")
            .update({ status: "cancelled" })
            .eq("id", msg.id);
          skipped++;
          continue;
        }

        // Check if lead status changed (won, lost, qualified+agendado, bot desativado)
        const { data: lead } = await supabase
          .from("leads")
          .select("status, bot_disabled, name, kanban_column_id")
          .eq("id", msg.lead_id)
          .single();

        // Bloqueia se o bot foi desligado ou se o lead já está em estado terminal
        if (lead && (lead.bot_disabled || lead.status === "won" || lead.status === "lost" || lead.status === "qualified")) {
          await supabase
            .from("cadence_messages")
            .update({ status: "cancelled" })
            .eq("lead_id", msg.lead_id)
            .eq("status", "pending");
          skipped++;
          continue;
        }

        const { data: config } = await supabase
          .from("whatsapp_configs")
          .select("zapi_instance_id, zapi_token, scheduling_link, office_name, practice_area, ai_prompt, communication_tone")
          .eq("company_id", msg.company_id)
          .maybeSingle();

        if (!config) {
          await supabase
            .from("cadence_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
          continue;
        }

        // Analyze conversation with AI before sending follow-up
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          try {
            const { data: conversationMsgs } = await supabase
              .from("whatsapp_messages")
              .select("message_text, direction, sender_name")
              .eq("company_id", msg.company_id)
              .eq("phone", msg.phone)
              .order("timestamp", { ascending: false })
              .limit(20);

            const history = (conversationMsgs || []).reverse().map((m: any) =>
              `${m.direction === "incoming" ? "Lead" : (m.sender_name || "Bot")}: ${m.message_text || ""}`
            ).join("\n");

            if (history.trim()) {
              const aiAnalysis = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-lite",
                  messages: [
                    {
                      role: "system",
                      content: `Você é um analista de leads. Analise a conversa abaixo e responda APENAS com um JSON: {"action": "continue" | "lost", "reason": "motivo breve"}

Responda "continue" se:
- O lead demonstrou interesse mas parou de responder (normal, vale tentar follow-up)
- A conversa foi curta e não houve rejeição explícita
- O lead pediu para falar depois ou disse que estava ocupado

Responda "lost" se:
- O lead disse EXPLICITAMENTE que NÃO quer ser contatado
- O lead pediu para parar de enviar mensagens
- O lead disse que já resolveu o problema
- O lead foi grosseiro ou bloqueou
- O lead disse que não tem interesse

Na DÚVIDA, responda "continue".`
                    },
                    { role: "user", content: `Conversa:\n${history}` }
                  ],
                }),
              });

              if (aiAnalysis.ok) {
                const aiData = await aiAnalysis.json();
                const content = aiData.choices?.[0]?.message?.content || "";
                
                // Extract JSON from response
                const jsonMatch = content.match(/\{[^}]+\}/);
                if (jsonMatch) {
                  try {
                    const decision = JSON.parse(jsonMatch[0]);
                    if (decision.action === "lost") {
                      console.log(`AI decided lead ${msg.lead_id} is lost: ${decision.reason}`);
                      
                      // Mark as lost
                      const { data: lostColumn } = await supabase
                        .from("kanban_columns")
                        .select("id")
                        .eq("company_id", msg.company_id)
                        .eq("is_lost", true)
                        .maybeSingle();

                      await supabase.from("leads").update({
                        status: "lost",
                        notes: `[IA - Follow-up] Lead descartado: ${decision.reason}`,
                        ...(lostColumn ? { kanban_column_id: lostColumn.id } : {}),
                      }).eq("id", msg.lead_id);

                      // Cancel all pending cadence
                      await supabase
                        .from("cadence_messages")
                        .update({ status: "cancelled" })
                        .eq("lead_id", msg.lead_id)
                        .eq("status", "pending");

                      skipped++;
                      continue;
                    }
                  } catch { /* parse error, continue normally */ }
                }
              }
            }
          } catch (aiErr) {
            console.error("AI cadence analysis error:", aiErr);
            // Continue with normal follow-up on AI error
          }
        }

        // Carrega estado da conversa para a cadência
        const { data: lastBotRow } = await supabase
          .from("whatsapp_messages")
          .select("message_text")
          .eq("company_id", msg.company_id)
          .eq("phone", msg.phone)
          .eq("direction", "outgoing")
          .order("timestamp", { ascending: false })
          .limit(1)
          .maybeSingle();
        const cadenceState = await loadConversationState(supabase, msg.lead_id, lastBotRow?.message_text || null);

        // Generate continuation message using AI based on full conversation
        let messageText = "";
        let cadenceSource = "";
        let cadenceRepetition: "allowed" | "blocked_identical" | "blocked_similar" = "allowed";

        if (LOVABLE_API_KEY) {
          try {
            const { data: convForReply } = await supabase
              .from("whatsapp_messages")
              .select("message_text, direction, sender_name, timestamp")
              .eq("company_id", msg.company_id)
              .eq("phone", msg.phone)
              .order("timestamp", { ascending: false })
              .limit(30);

            const convHistory = (convForReply || []).reverse().map((m: any) =>
              `${m.direction === "incoming" ? "Lead" : (m.sender_name || "Atendente")}: ${m.message_text || ""}`
            ).join("\n");

            const basePrompt = (config as any).ai_prompt || "Você é uma atendente virtual cordial e objetiva de um escritório de advocacia.";
            const tone = (config as any).communication_tone || "profissional e acolhedor";

            const previousBlock = cadenceState.previousFollowups.length > 0
              ? `\n\n⛔ TENTATIVAS DE RETOMADA JÁ ENVIADAS (NÃO REPETIR — varie ângulo e palavras):\n${cadenceState.previousFollowups.slice(0, 5).map((m, i) => `${i + 1}. ${m}`).join("\n")}`
              : "";

            const topicHint = cadenceState.openQuestion
              ? `\n\n🎯 ASSUNTO EM ABERTO (tópico: ${cadenceState.topic}): "${cadenceState.openQuestion}"\nRetome ESTE ponto especificamente.`
              : `\n\n🎯 TÓPICO EM ABERTO: ${cadenceState.topic}.`;

            const followupSystem = `${basePrompt}

═══════════════════════════════════════
🔄 CONTEXTO ESPECIAL: FOLLOW-UP DE CADÊNCIA
═══════════════════════════════════════
O lead PAROU de responder. Esta é a tentativa ${msg.day_number} de ${MAX_CADENCE_ATTEMPTS}.

REGRAS OBRIGATÓRIAS:
1. Continue de ONDE PAROU — NÃO recomece, NÃO se reapresente, NÃO repita perguntas já feitas
2. Tom: ${tone}. Curto (1-3 linhas). Humano, sem soar robô.
3. Use o nome do lead se souber: "${lead?.name || ""}"
4. Responda APENAS com o texto da mensagem, sem aspas, sem JSON.${topicHint}${previousBlock}`;

            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: followupSystem },
                  { role: "user", content: `Histórico:\n\n${convHistory}\n\n---\nGere a próxima mensagem de retomada.` },
                ],
              }),
            });

            if (aiResp.ok) {
              const aiJson = await aiResp.json();
              const aiText = (aiJson.choices?.[0]?.message?.content || "").trim();
              messageText = aiText.replace(/^["'`]+|["'`]+$/g, "").trim();
              cadenceSource = messageText ? "ai" : "";
            }
          } catch (genErr) {
            console.error("AI follow-up generation error:", genErr);
          }
        }

        // Validador de repetição
        if (messageText) {
          cadenceRepetition = await checkRepetition(messageText, cadenceState.previousFollowups);
          if (cadenceRepetition !== "allowed") {
            console.log(`Cadência IA descartada (${cadenceRepetition}) → fallback por tópico ${cadenceState.topic}`);
            messageText = renderTopicFallback(cadenceState.topic, lead?.name || "");
            cadenceSource = "template_fallback_topic";
          }
        }

        // Fallback por tópico (em vez do template genérico antigo)
        if (!messageText) {
          messageText = renderTopicFallback(cadenceState.topic, lead?.name || "");
          cadenceSource = "template_fallback_topic";
          if (!messageText) {
            messageText = msg.message_text || CADENCE_MESSAGES[msg.day_number] || CADENCE_MESSAGES[1];
            if (lead?.name) messageText = messageText.replace(/\{nome\}/g, lead.name);
            cadenceSource = "template_fallback_default";
          }
        }

        if ((config as any).scheduling_link && msg.day_number >= 2 && !messageText.includes("http")) {
          messageText += `\n\n${(config as any).scheduling_link}`;
        }

        const result = await sendWhatsAppMessage(config, msg.phone, messageText);

        if (result) {
          await supabase
            .from("cadence_messages")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", msg.id);

          await supabase.from("whatsapp_messages").insert({
            company_id: msg.company_id,
            lead_id: msg.lead_id,
            phone: msg.phone,
            message_text: messageText,
            direction: "outgoing",
            sender_name: "Cadência",
            message_id_external: result.messageId || null,
            timestamp: new Date().toISOString(),
          });

          await recordFollowupAudit(supabase, {
            companyId: msg.company_id,
            leadId: msg.lead_id,
            phone: msg.phone,
            topic: cadenceState.topic,
            openQuestion: cadenceState.openQuestion,
            messageSent: messageText,
            source: cadenceSource || "ai",
            triggerKind: `cadence_day_${msg.day_number}`,
            inactiveMinutes: 0,
            repetitionCheck: cadenceRepetition,
          });

          // Novo funil: pos 0=Em Atendimento, pos 1..5=1º a 5º Follow-UP
          // day_number 1 → pos 1 (1º Follow-UP), ..., day_number 5 → pos 5 (5º Follow-UP)
          const targetPosition = Math.min(msg.day_number, 5);
          const { data: targetColumn } = await supabase
            .from("kanban_columns")
            .select("id")
            .eq("company_id", msg.company_id)
            .eq("position", targetPosition)
            .maybeSingle();

          if (targetColumn) {
            await supabase.from("leads").update({
              kanban_column_id: targetColumn.id,
            }).eq("id", msg.lead_id);
          }

          // Enfileira a PRÓXIMA etapa da cadência (se houver) com base no
          // delay_minutes configurado. Regra: só dispara se o lead continuar
          // 30min (ou o tempo configurado) sem responder após esta mensagem.
          if (msg.day_number < MAX_CADENCE_ATTEMPTS) {
            const nextStep = msg.day_number + 1;
            const nextDelayMin = await getNextCadenceDelay(supabase, msg.company_id, nextStep);
            if (nextDelayMin !== null) {
              const nextScheduledAt = new Date(Date.now() + nextDelayMin * 60 * 1000).toISOString();
              await supabase.from("cadence_messages").insert({
                company_id: msg.company_id,
                lead_id: msg.lead_id,
                phone: msg.phone,
                day_number: nextStep,
                message_text: null,
                scheduled_at: nextScheduledAt,
                status: "pending",
              });
            }
          }

          if (msg.day_number >= MAX_CADENCE_ATTEMPTS) {
            const { data: lostColumn } = await supabase
              .from("kanban_columns")
              .select("id")
              .eq("company_id", msg.company_id)
              .eq("is_lost", true)
              .maybeSingle();

            if (lostColumn) {
              await supabase.from("leads").update({
                kanban_column_id: lostColumn.id,
                status: "lost",
                notes: "[Cadência] Lead não respondeu após 5 tentativas de contato",
              }).eq("id", msg.lead_id);
            }
          }

          sent++;
        } else {
          await supabase
            .from("cadence_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
        }
      } catch (err) {
        console.error("Error processing cadence message:", msg.id, err);
        await supabase
          .from("cadence_messages")
          .update({ status: "failed" })
          .eq("id", msg.id);
      }
    }

    // ========== PART 2: Process inactivity nudges ==========
    const nudgesSent = await processInactivityNudges(supabase);

    console.log(`Cadence: ${sent} sent, ${skipped} skipped | Nudges: ${nudgesSent} sent`);

    return new Response(
      JSON.stringify({
        cadence: { processed: (pendingMessages || []).length, sent, skipped },
        nudges: { sent: nudgesSent },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Cadence processing error:", error);
    const errorMessage = getErrorMessage(error, "Unknown error");
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
