import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZAPSIGN_API = "https://api.zapsign.com.br";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const accessToken = authHeader.replace("Bearer ", "").trim();
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(accessToken);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, lead_id, template_id, signer_name, signer_email, signer_phone, document_name, send_whatsapp } = await req.json();

    if (!company_id || !lead_id || !signer_name) {
      return new Response(JSON.stringify({ error: "company_id, lead_id e signer_name são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get ZapSign config
    const { data: zapsignConfig } = await adminClient
      .from("zapsign_configs")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!zapsignConfig) {
      return new Response(JSON.stringify({ error: "ZapSign não configurada para esta empresa" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiToken = zapsignConfig.api_token;
    const templateToUse = template_id || zapsignConfig.default_template_id;

    if (!templateToUse) {
      return new Response(JSON.stringify({ error: "Nenhum template configurado. Configure um template padrão ou envie template_id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docName = document_name || `Contrato - ${signer_name}`;

    // Create document from template via ZapSign API
    const zapsignBody: Record<string, unknown> = {
      sandbox: zapsignConfig.sandbox,
      name: docName,
      lang: "pt-br",
      signers: [
        {
          name: signer_name,
          ...(signer_email ? { email: signer_email } : {}),
          ...(signer_phone ? { phone_country: "55", phone_number: signer_phone.replace(/\D/g, "").replace(/^55/, "") } : {}),
          auth_mode: "assinaturaTela",
          send_automatic_email: false,
          send_automatic_whatsapp: false,
        },
      ],
    };

    const zapsignResp = await fetch(`${ZAPSIGN_API}/api/v1/models/create-doc/?template_id=${templateToUse}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zapsignBody),
    });

    if (!zapsignResp.ok) {
      const errBody = await zapsignResp.text();
      console.error("ZapSign API error:", zapsignResp.status, errBody);
      return new Response(JSON.stringify({ error: `Erro na API ZapSign: ${zapsignResp.status}`, details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zapsignData = await zapsignResp.json();
    const signerData = zapsignData.signers?.[0];
    const signUrl = signerData?.sign_url || "";
    const zapsignDocId = String(zapsignData.open_id || zapsignData.token || "");
    const zapsignDocToken = zapsignData.token || "";

    // Save to database
    const { data: docRecord, error: insertError } = await adminClient
      .from("zapsign_documents")
      .insert({
        company_id,
        lead_id,
        zapsign_doc_id: zapsignDocId,
        zapsign_doc_token: zapsignDocToken,
        document_name: docName,
        signer_name,
        signer_email: signer_email || null,
        signer_phone: signer_phone || null,
        sign_url: signUrl,
        status: "pending",
        sent_via_whatsapp: !!send_whatsapp,
        created_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar documento" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update lead contract_status
    await adminClient
      .from("leads")
      .update({ contract_status: "sent" })
      .eq("id", lead_id);

    // Send via WhatsApp if requested
    if (send_whatsapp && signer_phone) {
      const { data: whatsappConfig } = await adminClient
        .from("whatsapp_configs")
        .select("zapi_instance_id, zapi_token")
        .eq("company_id", company_id)
        .maybeSingle();

      if (whatsappConfig) {
        const UAZAPI_ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
        const formattedPhone = signer_phone.replace(/\D/g, "");
        const whatsappPhone = formattedPhone.startsWith("55") ? formattedPhone : `55${formattedPhone}`;

        const whatsappMessage = `📄 *Contrato para Assinatura Digital*\n\nOlá ${signer_name}! 👋\n\nSeu contrato "${docName}" está pronto para assinatura.\n\n✍️ Clique no link abaixo para assinar:\n${signUrl}\n\n⚡ O processo é rápido e 100% digital.\n\nQualquer dúvida, estamos à disposição!`;

        try {
          await fetch(`https://ziondigital.uazapi.com/instances/${whatsappConfig.zapi_instance_id}/message/sendText`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "AdminToken": UAZAPI_ADMIN_TOKEN || "",
              "Authorization": `Bearer ${whatsappConfig.zapi_token}`,
            },
            body: JSON.stringify({
              phone: whatsappPhone,
              message: whatsappMessage,
            }),
          });

          // Log message
          await adminClient.from("whatsapp_messages").insert({
            company_id,
            phone: whatsappPhone,
            lead_id,
            direction: "outgoing",
            message_text: whatsappMessage,
            sender_name: "Sistema",
          });
        } catch (whatsErr) {
          console.error("WhatsApp send error:", whatsErr);
          // Don't fail the whole request, just log
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      document: docRecord,
      sign_url: signUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
