// Server-side management of Asaas API key.
// Only admins or company managers can save the secret; the key never leaves the server.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    if (!token) return json({ error: "missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return json({ error: "invalid auth" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { company_id, api_key, environment } = body as {
      company_id?: string;
      api_key?: string;
      environment?: string;
    };

    if (!company_id || typeof company_id !== "string") {
      return json({ error: "company_id obrigatório" }, 400);
    }
    if (!api_key || typeof api_key !== "string" || api_key.length < 20) {
      return json({ error: "api_key inválida" }, 400);
    }
    const env = environment === "sandbox" ? "sandbox" : "production";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // AuthZ: admin OR member of company OR manager belonging to company
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles || []).map((r: { role: string }) => r.role));
    const isAdmin = roleSet.has("admin") || roleSet.has("member");

    if (!isAdmin) {
      const { data: link } = await admin
        .from("client_companies")
        .select("id")
        .eq("user_id", userId)
        .eq("company_id", company_id)
        .maybeSingle();
      const isManager = roleSet.has("gerente") && !!link;
      if (!isManager) return json({ error: "forbidden" }, 403);
    }

    // Quick validation against Asaas: must respond 200 to /myAccount
    const baseUrl = env === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";
    const probe = await fetch(`${baseUrl}/myAccount`, {
      headers: { access_token: api_key },
    });
    if (!probe.ok) {
      return json({ error: `Chave Asaas inválida (HTTP ${probe.status})` }, 400);
    }

    const { data: existing } = await admin
      .from("asaas_configs")
      .select("id")
      .eq("company_id", company_id)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("asaas_configs")
        .update({ api_key, environment: env })
        .eq("id", existing.id);
      if (error) return json({ error: error.message }, 500);
    } else {
      const { error } = await admin
        .from("asaas_configs")
        .insert({ company_id, api_key, environment: env });
      if (error) return json({ error: error.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
