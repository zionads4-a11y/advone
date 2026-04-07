import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CADENCE_MESSAGES: Record<number, string> = {
  1: "Oi! Vi que você ainda não conseguiu responder 😊\nPosso te ajudar com alguma coisa?",
  2: "Passando para te ajudar 😊\nAinda faz sentido falar com um advogado sobre seu caso?",
  3: "Dependendo do seu caso, pode ser importante agir rápido.\nPosso te encaixar na agenda 👇",
  4: "Oi! Só passando mais uma vez. A consulta é gratuita e sem compromisso 😊\nQuer que eu agende pra você?",
  5: "Última mensagem, prometo 😅\nSe ainda precisar de ajuda jurídica, o advogado está disponível. É só responder!",
};

const MAX_CADENCE_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending cadence messages that are due
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("cadence_messages")
      .select("id, company_id, lead_id, phone, day_number, message_text")
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

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;

    for (const msg of pendingMessages) {
      try {
        // Check if lead has responded since cadence was created (skip if so)
        const { data: recentIncoming } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("company_id", msg.company_id)
          .eq("phone", msg.phone)
          .eq("direction", "incoming")
          .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentIncoming && recentIncoming.length > 0) {
          // Lead responded — cancel remaining cadence
          await supabase
            .from("cadence_messages")
            .update({ status: "cancelled" })
            .eq("lead_id", msg.lead_id)
            .eq("status", "pending");
          skipped++;
          continue;
        }

        // Check if lead status changed (no longer "new")
        const { data: lead } = await supabase
          .from("leads")
          .select("status")
          .eq("id", msg.lead_id)
          .single();

        if (lead && lead.status !== "new") {
          await supabase
            .from("cadence_messages")
            .update({ status: "cancelled" })
            .eq("lead_id", msg.lead_id)
            .eq("status", "pending");
          skipped++;
          continue;
        }

        // Get Z-API config
        const { data: config } = await supabase
          .from("whatsapp_configs")
          .select("zapi_instance_id, zapi_token, scheduling_link")
          .eq("company_id", msg.company_id)
          .maybeSingle();

        if (!config) {
          await supabase
            .from("cadence_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
          continue;
        }

        // Build message with scheduling link
        let messageText = msg.message_text || CADENCE_MESSAGES[msg.day_number] || CADENCE_MESSAGES[1];
        if ((config as any).scheduling_link) {
          messageText += `\n\n${(config as any).scheduling_link}`;
        }

        // Send via UaZapi
        const SERVER_URL = "https://ziondigital.uazapi.com";
        const sendUrl = `${SERVER_URL}/send/text`;
        const sendResponse = await fetch(sendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "token": config.zapi_token || config.zapi_instance_id,
          },
          body: JSON.stringify({ number: msg.phone, body: messageText }),
        });

        if (sendResponse.ok) {
          const sendResult = await sendResponse.json();

          // Mark as sent
          await supabase
            .from("cadence_messages")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", msg.id);

          // Store outgoing message
          await supabase.from("whatsapp_messages").insert({
            company_id: msg.company_id,
            lead_id: msg.lead_id,
            phone: msg.phone,
            message_text: messageText,
            direction: "outgoing",
            sender_name: "Cadência",
            message_id_external: sendResult.messageId || null,
            timestamp: new Date().toISOString(),
          });

          sent++;
        } else {
          console.error("Z-API send failed for cadence:", msg.id, await sendResponse.text());
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

    console.log(`Cadence processed: ${sent} sent, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ processed: pendingMessages.length, sent, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Cadence processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
