// Meta Cloud API webhook receiver.
// - GET: handshake (hub.challenge) validando hub.verify_token contra whatsapp_configs.meta_verify_token.
// - POST: valida assinatura X-Hub-Signature-256, normaliza payload Meta -> formato UaZapi,
//         e encaminha para a edge function `zapi-webhook` que já possui todo o pipeline da Laura.
//
// URL de configuração no painel Meta:
//   https://<project>.supabase.co/functions/v1/meta-webhook?company_id=<uuid>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { webhookCorsHeaders as corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifySignature(secret: string, rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = signatureHeader.replace(/^sha256=/, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  // constant-time compare
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function toUazapiPayload(companyId: string, phoneNumberId: string, entry: any) {
  // entry.changes[0].value.messages[0]
  const value = entry?.changes?.[0]?.value;
  if (!value) return null;
  const message = value.messages?.[0];
  if (!message) return null;
  const contact = value.contacts?.[0];
  const from = String(message.from || "");
  const senderName = contact?.profile?.name || "";

  const text =
    message.text?.body ||
    message.button?.text ||
    message.interactive?.button_reply?.title ||
    message.interactive?.list_reply?.title ||
    message.image?.caption ||
    message.video?.caption ||
    message.document?.caption ||
    "";

  const mediaId =
    message.image?.id || message.video?.id || message.audio?.id || message.document?.id || null;
  const mediaMime =
    message.image?.mime_type || message.video?.mime_type ||
    message.audio?.mime_type || message.document?.mime_type || null;

  // Meta não devolve URL pública — precisamos construir GET /{media_id} pra pegar url temporária.
  // Para o pipeline processar áudio/imagem, colocamos o media_id em campo "url" placeholder
  // e o zapi-webhook original só usa a URL para transcrição; fluxos texto funcionam integralmente.
  // Fase 2: implementar download binário via /media e reupload no storage.

  const uaMsg: any = {
    sender_pn: from,
    chatid: from,
    senderName,
    text: text ? { body: text } : undefined,
    messageid: message.id,
  };
  if (message.type === "audio" || message.type === "voice") {
    uaMsg.audio = { url: mediaId ? `meta://${mediaId}` : null, mimetype: mediaMime };
  }
  if (message.type === "image") {
    uaMsg.image = { url: mediaId ? `meta://${mediaId}` : null, mimetype: mediaMime, caption: text };
  }
  if (message.type === "document") {
    uaMsg.document = {
      url: mediaId ? `meta://${mediaId}` : null,
      mimetype: mediaMime,
      filename: message.document?.filename || null,
    };
  }

  return {
    EventType: "messages",
    fromMe: false,
    message: uaMsg,
    chat: { id: from, name: senderName },
    phone: from,
    messageId: message.id,
    _meta_provider: true,
    _meta_phone_number_id: phoneNumberId,
    _meta_company_id: companyId,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const companyId = url.searchParams.get("company_id");

  // ---- GET: handshake ----
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (!companyId || mode !== "subscribe" || !token) {
      return new Response("bad request", { status: 400, headers: corsHeaders });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: cfg } = await admin
      .from("whatsapp_configs")
      .select("meta_verify_token")
      .eq("company_id", companyId)
      .maybeSingle();
    if (!cfg || cfg.meta_verify_token !== token) {
      return new Response("forbidden", { status: 403, headers: corsHeaders });
    }
    return new Response(challenge || "", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!companyId) {
    return new Response(JSON.stringify({ error: "company_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: cfg } = await admin
    .from("whatsapp_configs")
    .select("meta_app_secret, meta_phone_number_id, provider")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!cfg || cfg.provider !== "meta_cloud") {
    return new Response(JSON.stringify({ error: "meta config not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Valida assinatura HMAC. Prioridade: app_secret por-empresa (raro) -> META_APP_SECRET global.
  const appSecret = cfg.meta_app_secret || Deno.env.get("META_APP_SECRET") || "";
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    const ok = await verifySignature(appSecret, rawBody, sig);
    if (!ok) {
      console.warn("[meta-webhook] invalid signature for company", companyId);
      return new Response("invalid signature", { status: 401, headers: corsHeaders });
    }
  } else {
    console.warn("[meta-webhook] no app_secret configured — signature not verified");
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch {
    return new Response("invalid json", { status: 400, headers: corsHeaders });
  }

  // Ignora eventos que não sejam mensagens (statuses, delivery)
  const entries = payload.entry || [];
  const forwardResults: any[] = [];
  for (const entry of entries) {
    const uaPayload = toUazapiPayload(companyId, cfg.meta_phone_number_id || "", entry);
    if (!uaPayload) continue;

    // Forward para zapi-webhook mantendo query company_id
    try {
      const target = `${SUPABASE_URL}/functions/v1/zapi-webhook?company_id=${encodeURIComponent(companyId)}`;
      const res = await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(uaPayload),
      });
      forwardResults.push({ status: res.status });
    } catch (e) {
      console.error("[meta-webhook] forward error", e);
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: forwardResults.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
