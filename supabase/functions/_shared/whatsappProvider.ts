// Shared WhatsApp provider abstraction.
// Roteia envio entre UaZapi (padrão) e Meta Cloud API (oficial) baseado em `provider`.

export interface WhatsAppConfigRow {
  provider?: string | null;
  zapi_instance_id?: string | null;
  zapi_token?: string | null;
  meta_phone_number_id?: string | null;
  meta_access_token?: string | null;
  [k: string]: any;
}

export interface SendResult {
  ok: boolean;
  message_id?: string | null;
  status?: number;
  error?: string;
  raw?: any;
}

const UAZAPI_URL = "https://ziondigital.uazapi.com";
const META_API_VERSION = "v21.0";

function uazapiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const admin = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  if (admin) headers["admintoken"] = admin;
  return headers;
}

function uazapiQuery(config: WhatsAppConfigRow): string {
  const instance = encodeURIComponent(config.zapi_instance_id || "");
  const token = encodeURIComponent(config.zapi_token || config.zapi_instance_id || "");
  return `instance=${instance}&token=${token}`;
}

async function sendUazapiText(config: WhatsAppConfigRow, to: string, text: string): Promise<SendResult> {
  const res = await fetch(`${UAZAPI_URL}/send/text?${uazapiQuery(config)}`, {
    method: "POST",
    headers: uazapiHeaders(),
    body: JSON.stringify({ number: to, text }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(json), raw: json };
  return { ok: true, message_id: json.messageId || json.key?.id || null, raw: json };
}

async function sendUazapiMedia(
  config: WhatsAppConfigRow,
  to: string,
  mediaUrl: string,
  caption?: string,
): Promise<SendResult> {
  const body: any = { number: to, mediaUrl };
  if (caption) body.caption = caption;
  const res = await fetch(`${UAZAPI_URL}/send/media?${uazapiQuery(config)}`, {
    method: "POST",
    headers: uazapiHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(json), raw: json };
  return { ok: true, message_id: json.messageId || json.key?.id || null, raw: json };
}

async function sendMetaText(config: WhatsAppConfigRow, to: string, text: string): Promise<SendResult> {
  const phoneId = config.meta_phone_number_id;
  const token = config.meta_access_token || Deno.env.get("META_PERMANENT_ACCESS_TOKEN");
  if (!phoneId || !token) return { ok: false, error: "Credenciais Meta ausentes" };
  const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: text, preview_url: false },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(json), raw: json };
  return { ok: true, message_id: json.messages?.[0]?.id || null, raw: json };
}

async function sendMetaMedia(
  config: WhatsAppConfigRow,
  to: string,
  mediaUrl: string,
  caption?: string,
  mediaType?: string,
): Promise<SendResult> {
  const phoneId = config.meta_phone_number_id;
  const token = config.meta_access_token;
  if (!phoneId || !token) return { ok: false, error: "Credenciais Meta ausentes" };
  // Detecta tipo pela extensão se não informado
  const t = (mediaType || "").toLowerCase();
  const isImage = t.startsWith("image") || /\.(png|jpe?g|webp)$/i.test(mediaUrl);
  const isVideo = t.startsWith("video") || /\.(mp4|3gp|mov)$/i.test(mediaUrl);
  const isAudio = t.startsWith("audio") || /\.(ogg|mp3|m4a|aac)$/i.test(mediaUrl);
  const kind = isImage ? "image" : isVideo ? "video" : isAudio ? "audio" : "document";

  const payload: any = {
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""),
    type: kind,
    [kind]: { link: mediaUrl, ...(caption && kind !== "audio" ? { caption } : {}) },
  };
  const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: JSON.stringify(json), raw: json };
  return { ok: true, message_id: json.messages?.[0]?.id || null, raw: json };
}

export async function sendText(
  config: WhatsAppConfigRow,
  to: string,
  text: string,
): Promise<SendResult> {
  return (config.provider || "uazapi") === "meta_cloud"
    ? sendMetaText(config, to, text)
    : sendUazapiText(config, to, text);
}

export async function sendMedia(
  config: WhatsAppConfigRow,
  to: string,
  mediaUrl: string,
  caption?: string,
  mediaType?: string,
): Promise<SendResult> {
  return (config.provider || "uazapi") === "meta_cloud"
    ? sendMetaMedia(config, to, mediaUrl, caption, mediaType)
    : sendUazapiMedia(config, to, mediaUrl, caption);
}
