// Meta Pixel + Conversions API helper
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

const PIXEL_ID = "1295418425710536";

function getCookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function uuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface TrackOptions {
  email?: string;
  phone?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  customData?: Record<string, any>;
}

/**
 * Dispara evento no Pixel (browser) + Conversions API (server) com mesmo event_id (deduplicação).
 */
export async function trackMetaEvent(eventName: string, opts: TrackOptions = {}) {
  const eventId = uuid();
  const { email, phone, value, currency = "BRL", contentName, customData = {} } = opts;

  const pixelData: Record<string, any> = { ...customData };
  if (value !== undefined) {
    pixelData.value = value;
    pixelData.currency = currency;
  }
  if (contentName) pixelData.content_name = contentName;

  // 1. Browser Pixel
  try {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", eventName, pixelData, { eventID: eventId });
    }
  } catch (e) {
    console.warn("[meta-pixel] browser fbq failed", e);
  }

  // 2. Conversions API (server-side via edge function)
  try {
    const userData: Record<string, any> = {
      client_user_agent: navigator.userAgent,
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
    };
    if (email) userData.em = await sha256(email);
    if (phone) userData.ph = await sha256(phone.replace(/\D/g, ""));

    await supabase.functions.invoke("meta-capi", {
      body: {
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        user_data: userData,
        custom_data: pixelData,
      },
    });
  } catch (e) {
    console.warn("[meta-pixel] CAPI failed", e);
  }
}

export const PIXEL = { id: PIXEL_ID };
