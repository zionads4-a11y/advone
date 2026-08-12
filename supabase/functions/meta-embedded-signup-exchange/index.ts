// Troca `code` do Embedded Signup por access_token de longa duração,
// registra webhook automaticamente na WABA do cliente e persiste em whatsapp_configs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_APP_ID = Deno.env.get("META_APP_ID")!;
const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
const META_V = "v23.0";

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
    const { code, company_id, phone_number_id, waba_id, redirect_uri } = await req.json();
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
    const tokenUrl = new URL(`https://graph.facebook.com/${META_V}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("code", code);
    if (redirect_uri) tokenUrl.searchParams.set("redirect_uri", redirect_uri);
    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return j(400, { error: "token exchange failed", raw: tokenJson });
    }
    const accessToken = tokenJson.access_token as string;

    // 2) Descobre WABA e número quando não vieram do frontend
    let wabaId: string | null = waba_id ?? null;
    let phoneId: string | null = phone_number_id ?? null;

    if (!wabaId) {
      const dbg = await fetch(
        `https://graph.facebook.com/${META_V}/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`,
      )
        .then((r) => r.json())
        .catch(() => null);
      const scopes = dbg?.data?.granular_scopes as
        | Array<{ scope: string; target_ids?: string[] }>
        | undefined;
      wabaId =
        scopes?.find((s) => s.scope === "whatsapp_business_management")?.target_ids?.[0] ??
        scopes?.find((s) => s.scope === "whatsapp_business_messaging")?.target_ids?.[0] ??
        null;
    }

    if (wabaId && !phoneId) {
      const phones = await fetch(
        `https://graph.facebook.com/${META_V}/${wabaId}/phone_numbers?access_token=${accessToken}`,
      )
        .then((r) => r.json())
        .catch(() => null);
      phoneId = phones?.data?.[0]?.id ?? null;
    }

    // 3) Assina o app na WABA -> webhook automático
    let subscribeResult: any = null;
    if (wabaId) {
      const subRes = await fetch(`https://graph.facebook.com/${META_V}/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
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
      meta_phone_number_id: phoneId || null,
      meta_waba_id: wabaId || null,
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
