import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { webhookCorsHeaders as corsHeaders } from "../_shared/cors.ts";
import { log } from "../_shared/logger.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedToken = Deno.env.get("ZAPSIGN_WEBHOOK_TOKEN");
    if (!expectedToken) {
      log("error", "zapsign-webhook", "ZAPSIGN_WEBHOOK_TOKEN not configured — rejecting");
      return new Response("Service Unavailable", { status: 503, headers: corsHeaders });
    }
    const received = req.headers.get("authorization");
    if (received !== expectedToken && received !== `Bearer ${expectedToken}`) {
      log("warn", "zapsign-webhook", "Unauthorized attempt");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);


    const body = await req.json();
    log("info", "zapsign-webhook", "Received webhook", { eventType: body.event_type || body.type });

    const eventId = body.id || `zapsign_${body.doc?.token || body.doc_token}_${Date.now()}`;
    const { data: existing } = await adminClient
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      log("info", "zapsign-webhook", "Duplicate event skipped", { eventId });
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("webhook_events").insert({
      event_id: eventId,
      event_type: body.event_type || body.type || "unknown",
      payload: body,
    });


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

  // ============ AUTO-CRIAR CLOSED_CONTRACT ao ser assinado ============
  if (newStatus === "signed" && doc.lead_id && doc.company_id) {
    try {
      // Verifica se já existe contrato registrado para esse documento
      const { data: existingContract } = await adminClient
        .from("closed_contracts")
        .select("id")
        .eq("zapsign_document_id", doc.id)
        .maybeSingle();

      if (!existingContract) {
        // Buscar dados do lead para preencher o contrato
        const { data: leadData } = await adminClient
          .from("leads")
          .select("name, phone, whatsapp, cpf_cliente_final, cpf, honorarios_estimados, processo_numero, processo_valor")
          .eq("id", doc.lead_id)
          .maybeSingle();

        // Buscar config de comissão da empresa
        const { data: commissionCfg } = await adminClient
          .from("commission_settings")
          .select("commission_percentage")
          .eq("company_id", doc.company_id)
          .maybeSingle();

        const cpfFinal = leadData?.cpf_cliente_final || leadData?.cpf || "";
        const honorarios = Number(leadData?.honorarios_estimados || leadData?.processo_valor || 0);
        const commissionPct = Number(commissionCfg?.commission_percentage || 30);

        // Cria registro imutável do contrato fechado
        const { error: contractErr } = await adminClient
          .from("closed_contracts")
          .insert({
            company_id: doc.company_id,
            lead_id: doc.lead_id,
            zapsign_document_id: doc.id,
            client_name: doc.signer_name || leadData?.name || "Cliente",
            client_cpf: cpfFinal,
            client_phone: doc.signer_phone || leadData?.whatsapp || leadData?.phone || null,
            honorarios_estimados: honorarios,
            commission_percentage: commissionPct,
            commission_status: "aguardando_exito",
            process_status: "em_andamento",
            processo_cnj: leadData?.processo_numero || null,
            signed_at: signedAt || new Date().toISOString(),
            created_by: doc.created_by,
          });

        if (contractErr) {
          console.error("[CLOSED_CONTRACT] Falha ao criar:", contractErr);
        } else {
          console.log("[CLOSED_CONTRACT] Criado para lead", doc.lead_id);

          // Mover lead para coluna "Ganho" automaticamente
          const { data: wonCol } = await adminClient
            .from("kanban_columns")
            .select("id")
            .eq("company_id", doc.company_id)
            .eq("is_won", true)
            .order("position", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (wonCol) {
            await adminClient
              .from("leads")
              .update({ kanban_column_id: wonCol.id, status: "won" })
              .eq("id", doc.lead_id);
          }

          // Cadastrar processo no monitoramento Escavador (se houver CNJ ou CPF)
          if (leadData?.processo_numero || cpfFinal) {
            const { data: existingMonitor } = await adminClient
              .from("monitored_processes")
              .select("id")
              .eq("company_id", doc.company_id)
              .eq("numero_cnj", leadData?.processo_numero || `CPF-${cpfFinal}`)
              .maybeSingle();

            if (!existingMonitor && leadData?.processo_numero) {
              await adminClient.from("monitored_processes").insert({
                company_id: doc.company_id,
                numero_cnj: leadData.processo_numero,
                client_name: doc.signer_name || leadData?.name || "Cliente",
                is_active: true,
              });
            }
          }
        }
      }
    } catch (contractCreateErr) {
      console.error("[CLOSED_CONTRACT] Exception:", contractCreateErr);
    }
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
