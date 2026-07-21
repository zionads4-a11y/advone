// Troca `code` do Embedded Signup por access_token de longa duração,
// registra webhook automaticamente na WABA do cliente e persiste em whatsapp_configs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_APP_ID = Deno.env.get("META_APP_ID")!;
const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
const META_V = "v21.0";

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j(405, { error: "method not allowed" });

  try {
    const { code, company_id, phone_number_id, waba_id } = await req.json();
    if (!code || !company_id) return j(400, { error: "code and company_id required" });

    const authz = req.headers.get("Authorization");
    if (!authz) return j(401, { error: "missing auth" });
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authz } },
    });
    const claims = await userClient.auth.getClaims(authz.replace("Bearer ", ""));
    const uid = (claims as any)?.data?.claims?.sub;
    if (!uid) return j(401, { error: "invalid auth" });

    // 1) Troca code -> access_token
    const tokenRes = await fetch(
      `https://graph.facebook.com/${META_V}/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${encodeURIComponent(code)}`,
    );
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return j(400, { error: "token exchange failed", raw: tokenJson });
    }
    const accessToken = tokenJson.access_token as string;

    // 2) Se WABA veio no payload, faz subscribe do App na WABA -> webhook automático
    let subscribeResult: any = null;
    if (waba_id) {
      const subRes = await fetch(
        `https://graph.facebook.com/${META_V}/${waba_id}/subscribed_apps`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      subscribeResult = await subRes.json().catch(() => ({}));
    }

    // 3) Gera verify_token se não existir e persiste config
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: existing } = await admin
      .from("whatsapp_configs")
      .select("id, meta_verify_token")
      .eq("company_id", company_id)
      .maybeSingle();

    const verifyToken = existing?.meta_verify_token || crypto.randomUUID().replace(/-/g, "");

    const payload = {
      company_id,
      provider: "meta_cloud",
      meta_phone_number_id: phone_number_id || null,
      meta_waba_id: waba_id || null,
      meta_access_token: accessToken,
      meta_verify_token: verifyToken,
      meta_onboarded_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await admin.from("whatsapp_configs").update(payload).eq("id", existing.id);
    } else {
      await admin.from("whatsapp_configs").insert(payload);
    }

    return j(200, {
      ok: true,
      verify_token: verifyToken,
      subscribe: subscribeResult,
      webhook_url: `${SUPABASE_URL}/functions/v1/meta-webhook?company_id=${company_id}`,
    });
  } catch (e) {
    return j(500, { error: (e as Error).message });
  }
});
