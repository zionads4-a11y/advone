// Meta Conversions API proxy
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = "2203622766842085";
const ACCESS_TOKEN = Deno.env.get("META_PIXEL_ACCESS_TOKEN");

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
    authHeader.replace("Bearer ", "").trim()
  );
  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: "META_PIXEL_ACCESS_TOKEN not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      event_name,
      event_id,
      event_source_url,
      user_data = {},
      custom_data = {},
      action_source = "website",
    } = body;

    if (!event_name) {
      return new Response(JSON.stringify({ error: "event_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Capture client IP from headers
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      undefined;

    const userDataFinal: Record<string, any> = { ...user_data };
    if (ip) userDataFinal.client_ip_address = ip;
    if (!userDataFinal.client_user_agent) {
      userDataFinal.client_user_agent = req.headers.get("user-agent") ?? undefined;
    }

    // Hash any plaintext em/ph passed by mistake
    if (userDataFinal.em && !/^[a-f0-9]{64}$/i.test(userDataFinal.em)) {
      userDataFinal.em = await sha256(userDataFinal.em);
    }
    if (userDataFinal.ph && !/^[a-f0-9]{64}$/i.test(userDataFinal.ph)) {
      userDataFinal.ph = await sha256(String(userDataFinal.ph).replace(/\D/g, ""));
    }

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          event_source_url,
          action_source,
          user_data: userDataFinal,
          custom_data,
        },
      ],
    };

    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();

    if (!res.ok) {
      console.error("[meta-capi] FB error", res.status, text);
      return new Response(JSON.stringify({ error: "fb_api_error", status: res.status, body: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[meta-capi] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
