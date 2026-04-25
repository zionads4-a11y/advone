import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVER_URL = "https://ziondigital.uazapi.com";

interface ReminderWindow {
  column: string;       // DB column to mark as sent
  hoursBeforeMin: number; // min hours before event
  hoursBeforeMax: number; // max hours before event
  getMessage: (name: string, dateStr: string, timeStr: string) => string;
}

// 🎯 Cadência de lembretes com gatilhos psicológicos:
// 5h antes  → Reciprocidade ("o(a) Dr(a). já está estudando seu caso")
// 1h antes  → Compromisso ativo (pedir documentos + confirmar presença)
// 30min antes → Iminência ("Dr(a). está se preparando agora")
const REMINDER_WINDOWS: ReminderWindow[] = [
  {
    // 5 HORAS ANTES — Reciprocidade + Valorização
    column: "reminder_6h_sent",
    hoursBeforeMin: 4.5,
    hoursBeforeMax: 6,
    getMessage: (name, dateStr, timeStr) =>
      `Olá, ${name}! 👋\n\nPassando aqui para te avisar que o(a) Dr(a). responsável pelo seu atendimento *já foi informado(a)* sobre nossa conversa de hoje (${dateStr} às *${timeStr}*) e já está separando tudo para te ajudar a resolver o seu caso da melhor forma. ⚖️✨\n\nFoi reservado um horário exclusivo para você, então conto com a sua presença! 🤝`,
  },
  {
    // 1 HORA ANTES — Compromisso ativo + Pedido de confirmação
    column: "reminder_2h_sent",
    hoursBeforeMin: 0.85,
    hoursBeforeMax: 1.5,
    getMessage: (name, _dateStr, timeStr) =>
      `${name}, falta *1 hora* para o seu atendimento com o(a) advogado(a)! ⏰\n\n📅 Horário: *${timeStr}*\n\nPara aproveitarmos cada minuto e já sair com encaminhamentos concretos, peço que você:\n\n✅ Separe os *documentos* relacionados ao seu caso (mesmo que sejam fotos pelo celular)\n✅ Anote suas *dúvidas* principais\n✅ Esteja em um lugar *tranquilo* na hora da ligação\n\nMe responde aqui com um *"vou estar pronto(a)"* só para eu confirmar com o(a) Dr(a)? 😉`,
  },
  {
    // 30 MIN ANTES — Iminência + Escassez ("já está se preparando")
    column: "reminder_30m_sent",
    hoursBeforeMin: 0.25,
    hoursBeforeMax: 0.6,
    getMessage: (name, _dateStr, timeStr) =>
      `${name}, é AGORA! 🚨\n\nO(A) Dr(a). já está *preparando a sala* e em *25 minutos* vai entrar em contato com você (horário marcado: *${timeStr}*).\n\n📱 Deixe o celular por perto e o WhatsApp aberto\n📄 Documentos em mãos\n🔇 Ambiente em silêncio\n\nNos falamos em instantes! 👨‍⚖️✨`,
  },
];

function formatDateBR(date: Date): string {
  const days = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const d = date.getUTCDate().toString().padStart(2, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${days[date.getUTCDay()]}, ${d}/${m}`;
}

function formatTimeBR(date: Date): string {
  const h = date.getUTCHours().toString().padStart(2, "0");
  const min = date.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${min}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch upcoming meetings (next 7 hours) that are not completed
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const { data: reminders, error } = await supabase
      .from("lead_reminders")
      .select("id, lead_id, company_id, title, due_at, reminder_type, reminder_6h_sent, reminder_2h_sent, reminder_30m_sent")
      .eq("completed", false)
      .eq("reminder_type", "meeting")
      .gte("due_at", now.toISOString())
      .lte("due_at", maxFuture.toISOString())
      .limit(100);

    if (error) {
      console.error("Error fetching reminders:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const reminder of reminders) {
      const dueAt = new Date(reminder.due_at);
      // Convert to Brasília time (UTC-3)
      const dueBrasilia = new Date(dueAt.getTime() - 3 * 60 * 60 * 1000);
      const hoursUntil = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Get lead info
      const { data: lead } = await supabase
        .from("leads")
        .select("name, phone, whatsapp")
        .eq("id", reminder.lead_id)
        .single();

      if (!lead) continue;

      const phone = lead.whatsapp || lead.phone;
      if (!phone) continue;

      const leadName = lead.name.split(" ")[0]; // First name only

      // Get WhatsApp config
      const { data: config } = await supabase
        .from("whatsapp_configs")
        .select("zapi_instance_id, zapi_token")
        .eq("company_id", reminder.company_id)
        .maybeSingle();

      if (!config) continue;

      const dateStr = formatDateBR(dueBrasilia);
      const timeStr = formatTimeBR(dueBrasilia);

      for (const window of REMINDER_WINDOWS) {
        // Check if already sent
        if ((reminder as any)[window.column] === true) continue;

        // Check if within the time window
        if (hoursUntil < window.hoursBeforeMin || hoursUntil > window.hoursBeforeMax) continue;

        const messageText = window.getMessage(leadName, dateStr, timeStr);

        try {
          const sendUrl = `${SERVER_URL}/send/text`;
          const sendResponse = await fetch(sendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": config.zapi_token || config.zapi_instance_id,
            },
            body: JSON.stringify({ number: phone, body: messageText }),
          });

          if (sendResponse.ok) {
            const sendResult = await sendResponse.json();

            // Mark as sent
            await supabase
              .from("lead_reminders")
              .update({ [window.column]: true })
              .eq("id", reminder.id);

            // Store outgoing message
            await supabase.from("whatsapp_messages").insert({
              company_id: reminder.company_id,
              lead_id: reminder.lead_id,
              phone,
              message_text: messageText,
              direction: "outgoing",
              sender_name: "Lembrete",
              message_id_external: sendResult.messageId || null,
              timestamp: new Date().toISOString(),
            });

            console.log(`Reminder ${window.column} sent for lead ${reminder.lead_id}`);
            sent++;
          } else {
            console.error(`Failed to send ${window.column} for reminder ${reminder.id}:`, await sendResponse.text());
          }
        } catch (err) {
          console.error(`Error sending ${window.column}:`, err);
        }
      }
    }

    console.log(`Reminders processed: ${sent} sent`);

    return new Response(
      JSON.stringify({ processed: reminders.length, sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Reminder processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
