import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get company_id from URL path: /zapi-webhook?company_id=xxx
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      console.error("Missing company_id parameter");
      return new Response(JSON.stringify({ error: "Missing company_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify this company has a WhatsApp config
    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("id, company_id")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!config) {
      console.error("No WhatsApp config found for company:", companyId);
      return new Response(JSON.stringify({ error: "Company not configured" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Z-API webhook payload:", JSON.stringify(body));

    // Z-API sends different event types
    // For incoming messages: type === "ReceivedCallback"
    if (!body || !body.type) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.type === "ReceivedCallback") {
      const phone = body.phone || "";
      const senderName = body.senderName || body.chatName || "";
      const messageText = body.text?.message || body.image?.caption || body.video?.caption || "[mídia]";
      const messageIdExternal = body.messageId || "";
      const isGroup = body.isGroup || false;

      // Skip group messages
      if (isGroup) {
        return new Response(JSON.stringify({ ok: true, skipped: "group_message" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!phone) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_phone" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean phone number (remove @c.us suffix if present)
      const cleanPhone = phone.replace("@c.us", "").replace("@s.whatsapp.net", "");

      // Try to extract tracking code from message [XXXXXX]
      let trackingCode: string | null = null;
      let utmData: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string } = {};

      const codeMatch = messageText.match(/\[([A-Z0-9]{6})\]/);
      if (codeMatch) {
        trackingCode = codeMatch[1];
        console.log("Tracking code found in message:", trackingCode);

        // Look up the tracking click
        const { data: click } = await supabase
          .from("tracking_clicks")
          .select("id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, tracking_link_id")
          .eq("tracking_code", trackingCode)
          .is("lead_id", null)
          .maybeSingle();

        if (click) {
          utmData = {
            utm_source: click.utm_source || undefined,
            utm_medium: click.utm_medium || undefined,
            utm_campaign: click.utm_campaign || undefined,
            utm_content: click.utm_content || undefined,
            utm_term: click.utm_term || undefined,
          };
          console.log("UTM data from tracking click:", JSON.stringify(utmData));
        }
      }

      // Check if lead exists for this phone + company
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", companyId)
        .or(`phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone}`)
        .maybeSingle();

      let leadId = existingLead?.id;

      // If no lead exists, create one automatically
      if (!leadId) {
        // Get the first kanban column for this company (position 0)
        const { data: firstColumn } = await supabase
          .from("kanban_columns")
          .select("id")
          .eq("company_id", companyId)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            company_id: companyId,
            name: senderName || `Lead ${cleanPhone}`,
            phone: cleanPhone,
            whatsapp: cleanPhone,
            status: "new",
            kanban_column_id: firstColumn?.id || null,
            ...(utmData.utm_source && { utm_source: utmData.utm_source }),
            ...(utmData.utm_medium && { utm_medium: utmData.utm_medium }),
            ...(utmData.utm_campaign && { utm_campaign: utmData.utm_campaign }),
            ...(utmData.utm_content && { utm_content: utmData.utm_content }),
            ...(utmData.utm_term && { utm_term: utmData.utm_term }),
          })
          .select("id")
          .single();

        if (leadError) {
          console.error("Error creating lead:", leadError);
        } else {
          leadId = newLead.id;
          console.log("New lead created:", leadId, "for phone:", cleanPhone, "with UTMs:", JSON.stringify(utmData));
        }
      } else if (Object.keys(utmData).length > 0) {
        // Update existing lead with UTM data if it doesn't have any
        const { data: existingLeadData } = await supabase
          .from("leads")
          .select("utm_source")
          .eq("id", leadId)
          .single();

        if (existingLeadData && !existingLeadData.utm_source) {
          await supabase
            .from("leads")
            .update({
              ...(utmData.utm_source && { utm_source: utmData.utm_source }),
              ...(utmData.utm_medium && { utm_medium: utmData.utm_medium }),
              ...(utmData.utm_campaign && { utm_campaign: utmData.utm_campaign }),
              ...(utmData.utm_content && { utm_content: utmData.utm_content }),
              ...(utmData.utm_term && { utm_term: utmData.utm_term }),
            })
            .eq("id", leadId);
          console.log("Updated existing lead with UTM data:", leadId);
        }
      }

      // Match tracking click to lead
      if (trackingCode && leadId) {
        await supabase
          .from("tracking_clicks")
          .update({ lead_id: leadId, matched_at: new Date().toISOString() })
          .eq("tracking_code", trackingCode)
          .is("lead_id", null);
        console.log("Tracking click matched to lead:", leadId, "code:", trackingCode);
      }

      // Store the message
      const { error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id: companyId,
          lead_id: leadId || null,
          phone: cleanPhone,
          message_text: messageText,
          direction: "incoming",
          sender_name: senderName,
          message_id_external: messageIdExternal,
          timestamp: body.mompiont ? new Date(body.mompiont * 1000).toISOString() : new Date().toISOString(),
        });

      if (msgError) {
        console.error("Error storing message:", msgError);
      }

      return new Response(
        JSON.stringify({ ok: true, lead_id: leadId, new_lead: !existingLead, tracking_code: trackingCode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For sent messages (outgoing)
    if (body.type === "SentCallback" || body.type === "MessageStatusCallback") {
      return new Response(JSON.stringify({ ok: true, type: body.type }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default response for other webhook types
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
