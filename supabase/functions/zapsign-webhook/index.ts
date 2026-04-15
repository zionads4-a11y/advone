import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("ZapSign webhook received:", JSON.stringify(body));

    // ZapSign sends: { event_type, doc_token, signer_token, status, ... }
    const eventType = body.event_type || body.type;
    const docToken = body.doc?.token || body.doc_token || body.token;

    if (!docToken) {
      console.error("No doc token in webhook payload");
      return new Response(JSON.stringify({ error: "Missing doc token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the document by zapsign_doc_token
    const { data: doc, error: findError } = await adminClient
      .from("zapsign_documents")
      .select("*")
      .eq("zapsign_doc_token", docToken)
      .maybeSingle();

    if (findError || !doc) {
      // Try by zapsign_doc_id as fallback
      const { data: doc2 } = await adminClient
        .from("zapsign_documents")
        .select("*")
        .eq("zapsign_doc_id", docToken)
        .maybeSingle();

      if (!doc2) {
        console.error("Document not found for token:", docToken);
        return new Response(JSON.stringify({ ok: true, message: "Document not tracked" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return await processWebhook(adminClient, doc2, eventType, body);
    }

    return await processWebhook(adminClient, doc, eventType, body);
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processWebhook(
  adminClient: ReturnType<typeof createClient>,
  doc: Record<string, unknown>,
  eventType: string,
  body: Record<string, unknown>
) {
  let newStatus = doc.status as string;
  let signedAt = doc.signed_at as string | null;

  // Map ZapSign events to our statuses
  // ZapSign events: doc_created, doc_signed, doc_refused, doc_canceled, signer_signed
  if (eventType === "doc_signed" || eventType === "signer_signed") {
    newStatus = "signed";
    signedAt = new Date().toISOString();
  } else if (eventType === "doc_refused") {
    newStatus = "refused";
  } else if (eventType === "doc_canceled") {
    newStatus = "canceled";
  } else if (eventType === "doc_created") {
    newStatus = "pending";
  }

  // Update document status
  await adminClient
    .from("zapsign_documents")
    .update({ status: newStatus, signed_at: signedAt, updated_at: new Date().toISOString() })
    .eq("id", doc.id);

  // Update lead contract_status
  if (doc.lead_id) {
    const contractStatusMap: Record<string, string> = {
      signed: "signed",
      refused: "refused",
      canceled: "canceled",
      pending: "sent",
    };

    await adminClient
      .from("leads")
      .update({ contract_status: contractStatusMap[newStatus] || newStatus })
      .eq("id", doc.lead_id);
  }

  // If signed, notify via WhatsApp
  if (newStatus === "signed" && doc.company_id && doc.signer_phone) {
    try {
      const { data: whatsappConfig } = await adminClient
        .from("whatsapp_configs")
        .select("zapi_instance_id, zapi_token, alert_whatsapp")
        .eq("company_id", doc.company_id)
        .maybeSingle();

      if (whatsappConfig?.alert_whatsapp) {
        const UAZAPI_ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
        const alertPhone = whatsappConfig.alert_whatsapp.replace(/\D/g, "");

        await fetch(`https://ziondigital.uazapi.com/instances/${whatsappConfig.zapi_instance_id}/message/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "AdminToken": UAZAPI_ADMIN_TOKEN || "",
            "Authorization": `Bearer ${whatsappConfig.zapi_token}`,
          },
          body: JSON.stringify({
            phone: alertPhone.startsWith("55") ? alertPhone : `55${alertPhone}`,
            message: `✅ *Contrato Assinado!*\n\n📄 ${doc.document_name}\n👤 ${doc.signer_name}\n\nO cliente assinou o contrato digitalmente via ZapSign.`,
          }),
        });
      }
    } catch (notifyErr) {
      console.error("Notification error:", notifyErr);
    }
  }

  return new Response(JSON.stringify({ ok: true, status: newStatus }), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
