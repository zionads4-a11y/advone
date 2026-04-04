import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVER_URL = "https://ziondigital.uazapi.com";

function buildUaZapiHeaders() {
  return { "Content-Type": "application/json" };
}

function normalizeUaZapiValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isInstanceTokenMisconfigured(config: { zapi_token?: string | null }) {
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  return Boolean(adminToken && config.zapi_token && config.zapi_token.trim() === adminToken.trim());
}

function buildQueryParams(
  config: { zapi_instance_id: string; zapi_token?: string | null },
  options?: { includeInstanceToken?: boolean },
) {
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  const params = new URLSearchParams({ instance: config.zapi_instance_id });
  if (adminToken) params.set("admintoken", adminToken);
  if ((options?.includeInstanceToken ?? true) && config.zapi_token) params.set("token", config.zapi_token);
  return params;
}

function buildUaZapiStatusUrl(config: { zapi_instance_id: string; zapi_token?: string | null }) {
  return `${SERVER_URL}/status?${buildQueryParams(config).toString()}`;
}

async function readResponsePayload(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function isGenericHealthCheckPayload(payload: any) {
  const info = normalizeUaZapiValue(payload?.info);
  const checkedInstanceMessage = normalizeUaZapiValue(payload?.status?.checked_instance?.message);

  return info.includes("server health check")
    || (
      checkedInstanceMessage.includes("instance is healthy")
      && Boolean(payload?.status?.server_status)
      && typeof payload?.status?.total_instances !== "undefined"
      && !payload?.qrcode
      && !payload?.instance?.qrcode
    );
}

function isInstanceConnected(payload: any) {
  if (!payload || isGenericHealthCheckPayload(payload)) return false;

  // UaZapi /instance/connect returns { connected, status: { connected }, instance: { status } }
  if (payload?.status?.connected === true) return true;
  if (payload?.status?.connected === false) return false;

  const rootStatus = normalizeUaZapiValue(payload?.status);
  const instanceStatus = normalizeUaZapiValue(payload?.instance?.status);
  const dataStatus = normalizeUaZapiValue(payload?.data?.status);
  const checkedConnectionStatus = normalizeUaZapiValue(payload?.status?.checked_instance?.connection_status);
  const checkedInstanceStatus = normalizeUaZapiValue(payload?.status?.checked_instance?.status);

  return payload?.connected === true
    || payload?.instance?.connected === true
    || payload?.data?.connected === true
    || rootStatus === "open"
    || rootStatus === "connected"
    || instanceStatus === "open"
    || instanceStatus === "connected"
    || dataStatus === "open"
    || dataStatus === "connected"
    || checkedConnectionStatus === "open"
    || checkedInstanceStatus === "open";
}

function extractQrCode(payload: any) {
  return payload?.qrcode
    || payload?.qr
    || payload?.base64
    || payload?.value
    || payload?.data?.qrcode
    || payload?.instance?.qrcode
    || payload?.status?.qrcode
    || payload?.status?.checked_instance?.qrcode
    || null;
}

async function fetchUaZapiStatus(config: { zapi_instance_id: string; zapi_token?: string | null }) {
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  const headers = buildUaZapiHeaders();
  if (adminToken) headers["admintoken"] = adminToken;

  // Use POST /instance/connect which returns full status including connected field
  const connectUrl = `${SERVER_URL}/instance/connect?instance=${encodeURIComponent(config.zapi_instance_id)}&token=${encodeURIComponent(config.zapi_token || config.zapi_instance_id)}`;
  try {
    const res = await fetch(connectUrl, { method: "POST", headers });
    const payload = await readResponsePayload(res);
    console.log("UaZapi status check via /instance/connect:", res.status, JSON.stringify(payload).substring(0, 300));
    return { ok: res.ok, status: res.status, payload };
  } catch {
    // Fallback to GET /status
    const response = await fetch(buildUaZapiStatusUrl(config), { method: "GET", headers: buildUaZapiHeaders() });
    const payload = await readResponsePayload(response);
    return { ok: response.ok, status: response.status, payload };
  }
}

async function fetchUaZapiQrCode(config: { zapi_instance_id: string; zapi_token?: string | null }) {
  const headers = buildUaZapiHeaders();
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  const query = buildQueryParams(config).toString();

  // Primary: POST /instance/connect with admintoken header (confirmed working endpoint)
  const primaryUrl = `${SERVER_URL}/instance/connect?instance=${encodeURIComponent(config.zapi_instance_id)}&token=${encodeURIComponent(config.zapi_token || config.zapi_instance_id)}`;
  const primaryHeaders = { ...headers };
  if (adminToken) primaryHeaders["admintoken"] = adminToken;

  try {
    console.log("Trying primary QR endpoint:", primaryUrl);
    const primaryRes = await fetch(primaryUrl, { method: "POST", headers: primaryHeaders });
    const primaryPayload = await readResponsePayload(primaryRes);
    console.log("Primary QR response:", primaryRes.status, JSON.stringify(primaryPayload).substring(0, 200));

    if (primaryRes.ok) {
      const qrcode = extractQrCode(primaryPayload);
      if (qrcode) return { ok: true, payload: primaryPayload, qrcode };
      if (isInstanceConnected(primaryPayload)) return { ok: true, payload: primaryPayload, connected: true };
    }
  } catch (err) {
    console.error("Primary QR endpoint error:", err);
  }

  // Fallback candidates (GET)
  const candidates = [
    `${SERVER_URL}/qr?${query}`,
    `${SERVER_URL}/instance/qr?${query}`,
  ];

  const failures: Array<{ url: string; status: number; payload: any }> = [];

  for (const url of candidates) {
    const response = await fetch(url, { method: "GET", headers });
    const payload = await readResponsePayload(response);
    const qrcode = extractQrCode(payload);

    if (response.ok && qrcode) return { ok: true, payload, qrcode };
    if (response.ok && isInstanceConnected(payload)) return { ok: true, payload, connected: true };
    failures.push({ url, status: response.status, payload });
  }

  return { ok: false, failures };
}

async function disconnectUaZapiInstance(config: { zapi_instance_id: string; zapi_token?: string | null }) {
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  if (!adminToken) {
    return { ok: false, failures: [{ url: "", method: "N/A", status: 500, payload: { message: "UAZAPI_ADMIN_TOKEN não configurado" } }] };
  }

  const headers = buildUaZapiHeaders();
  const adminOnlyQuery = buildQueryParams(config, { includeInstanceToken: false }).toString();
  const fullQuery = buildQueryParams(config, { includeInstanceToken: true }).toString();

  const candidates: Array<{ url: string; method: "POST" | "DELETE" }> = [
    { url: `${SERVER_URL}/instance/disconnect?${adminOnlyQuery}`, method: "POST" },
    { url: `${SERVER_URL}/instance/disconnect?${fullQuery}`, method: "POST" },
    { url: `${SERVER_URL}/instance/disconnect?${adminOnlyQuery}`, method: "DELETE" },
    { url: `${SERVER_URL}/instance/logout?${adminOnlyQuery}`, method: "POST" },
    { url: `${SERVER_URL}/instance/logout?${fullQuery}`, method: "POST" },
  ];

  const failures: Array<{ url: string; method: string; status: number; payload: any }> = [];

  for (const { url, method } of candidates) {
    try {
      const res = await fetch(url, { method, headers });
      const payload = await readResponsePayload(res);
      console.log(`Disconnect ${method} ${url} => ${res.status}:`, JSON.stringify(payload));
      if (res.ok) return { ok: true, payload, failures: [] };
      failures.push({ url, method, status: res.status, payload });
    } catch (err) {
      failures.push({ url, method, status: 0, payload: { message: err instanceof Error ? err.message : "Erro" } });
    }
  }

  return { ok: false, failures };
}

async function configureWebhook(
  config: { zapi_instance_id: string; zapi_token?: string | null },
  companyId: string,
  supabaseUrl: string,
) {
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  if (!adminToken) return { ok: false, error: "UAZAPI_ADMIN_TOKEN not set" };

  const webhookUrl = `${supabaseUrl}/functions/v1/zapi-webhook?company_id=${companyId}`;
  const params = buildQueryParams(config).toString();

  // Try multiple endpoints for setting webhook
  const candidates = [
    { url: `${SERVER_URL}/webhook/set?${params}`, method: "POST" as const },
    { url: `${SERVER_URL}/instance/webhook?${params}`, method: "POST" as const },
    { url: `${SERVER_URL}/setWebhook?${params}`, method: "POST" as const },
  ];

  for (const { url, method } of candidates) {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "admintoken": adminToken },
        body: JSON.stringify({ url: webhookUrl, webhook: webhookUrl }),
      });
      const payload = await readResponsePayload(res);
      console.log(`Webhook config ${method} ${url} => ${res.status}:`, JSON.stringify(payload).substring(0, 300));
      if (res.ok) return { ok: true, payload };
    } catch (err) {
      console.error(`Webhook config error for ${url}:`, err);
    }
  }

  return { ok: false, error: "All webhook config endpoints failed" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // If token is provided, this is a public request via shareable link
    if (token) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      // Validate token
      const { data: tokenData, error: tokenError } = await adminClient
        .from("zapi_connect_tokens")
        .select("*, companies(name)")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: "Link expirado ou inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get whatsapp config for the company
      const { data: config } = await adminClient
        .from("whatsapp_configs")
        .select("zapi_instance_id, zapi_token")
        .eq("company_id", tokenData.company_id)
        .maybeSingle();

      if (!config) {
        return new Response(
          JSON.stringify({ error: "Z-API não configurada para esta empresa" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statusResult = await fetchUaZapiStatus(config);
      if (statusResult.ok && isInstanceConnected(statusResult.payload)) {
        return new Response(
          JSON.stringify({
            connected: true,
            company_name: tokenData.companies?.name || "Empresa",
            status: statusResult.payload,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qrResult = await fetchUaZapiQrCode(config);
      if (!qrResult.ok || !qrResult.qrcode) {
        console.error("UaZapi public QR code unavailable:", JSON.stringify(qrResult));
        return new Response(
          JSON.stringify({
            error: "Não foi possível obter o QR Code automaticamente para esta instância.",
            details: statusResult.payload,
            company_name: tokenData.companies?.name || "Empresa",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          qrcode: qrResult.qrcode,
          company_name: tokenData.companies?.name || "Empresa",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticated request - verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { company_id, action } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin or member
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "member"])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Sem permissão" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: save instance (auto-fetch token from UaZapi)
    if (action === "save_instance") {
      const { instance_id: instanceId } = body;
      if (!instanceId) {
        return new Response(
          JSON.stringify({ error: "instance_id é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN");
      if (!adminToken) {
        return new Response(
          JSON.stringify({ error: "Admin Token não configurado no servidor" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try to get instance token from UaZapi using admin token
      let instanceToken = "";
      try {
        // Try GET /instances with admintoken header
        const listRes = await fetch(`${SERVER_URL}/instances`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "admintoken": adminToken },
        });
        const listPayload = await readResponsePayload(listRes);
        console.log("UaZapi /instances response:", listRes.status, JSON.stringify(listPayload));

        if (listRes.ok && Array.isArray(listPayload)) {
          const found = listPayload.find((inst: any) =>
            inst.id === instanceId || inst.name === instanceId || inst.instance === instanceId
          );
          if (found) {
            instanceToken = found.token || found.apiToken || found.apiTokenInstance || "";
          }
        }

        // If not found, try GET /instance/info with admintoken
        if (!instanceToken) {
          const infoRes = await fetch(`${SERVER_URL}/instance/info?instance=${encodeURIComponent(instanceId)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "admintoken": adminToken },
          });
          const infoPayload = await readResponsePayload(infoRes);
          console.log("UaZapi /instance/info response:", infoRes.status, JSON.stringify(infoPayload));
          if (infoRes.ok) {
            instanceToken = infoPayload?.token || infoPayload?.instance?.token || "";
          }
        }
      } catch (err) {
        console.error("Error fetching instance token:", err);
      }

      // Save config (with or without auto-fetched token)
      const trimmedInstanceId = instanceId.trim();
      const configData = {
        zapi_instance_id: trimmedInstanceId,
        zapi_token: instanceToken?.trim() || trimmedInstanceId,
      };

      const { data: existing } = await adminClient
        .from("whatsapp_configs")
        .select("id")
        .eq("company_id", company_id)
        .maybeSingle();

      let saveError;
      if (existing) {
        const { error } = await adminClient
          .from("whatsapp_configs")
          .update(configData)
          .eq("id", existing.id);
        saveError = error;
      } else {
        const { error } = await adminClient
          .from("whatsapp_configs")
          .insert({ company_id, ...configData });
        saveError = error;
      }

      if (saveError) {
        return new Response(
          JSON.stringify({ error: "Erro ao salvar: " + saveError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          saved: true,
          instance_id: instanceId,
          token_found: !!instanceToken,
          message: instanceToken
            ? "Configuração salva com token da instância detectado automaticamente!"
            : "Configuração salva! O ID da instância será usado como token.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: generate shareable link
    if (action === "generate_link") {
      const { data: tokenData, error: insertError } = await adminClient
        .from("zapi_connect_tokens")
        .insert({ company_id, created_by: user.id })
        .select("token, expires_at")
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Erro ao gerar link: " + insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ token: tokenData.token, expires_at: tokenData.expires_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: check connection status
    if (action === "get-status") {
      const { data: config } = await adminClient
        .from("whatsapp_configs")
        .select("zapi_instance_id, zapi_token")
        .eq("company_id", company_id)
        .maybeSingle();

      if (!config || !config.zapi_instance_id) {
        return new Response(
          JSON.stringify({ error: "WhatsApp não configurado", connected: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const statusResult = await fetchUaZapiStatus(config);
        const connected = statusResult.ok && isInstanceConnected(statusResult.payload);

        return new Response(
          JSON.stringify({ connected, status: statusResult.payload }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ connected: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Action: get QR code directly
    if (action === "get_qrcode") {
      const { data: config } = await adminClient
        .from("whatsapp_configs")
        .select("zapi_instance_id, zapi_token")
        .eq("company_id", company_id)
        .maybeSingle();

      if (!config || !config.zapi_instance_id) {
        return new Response(
          JSON.stringify({ error: "Nome da instância não configurado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statusResult = await fetchUaZapiStatus(config);
      console.log("UaZapi status response:", JSON.stringify(statusResult.payload));

      if (statusResult.ok && isInstanceConnected(statusResult.payload)) {
        return new Response(
          JSON.stringify({ connected: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qrResult = await fetchUaZapiQrCode(config);
      if (!qrResult.ok || !qrResult.qrcode) {
        console.error("UaZapi QR fetch failed:", JSON.stringify(qrResult));
        return new Response(
          JSON.stringify({
            error: "Instância desconectada, mas o servidor UaZapi não retornou QR Code.",
            details: statusResult.payload,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ qrcode: qrResult.qrcode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: disconnect instance
    if (action === "disconnect") {
      const { data: config } = await adminClient
        .from("whatsapp_configs")
        .select("zapi_instance_id, zapi_token")
        .eq("company_id", company_id)
        .maybeSingle();

      if (!config || !config.zapi_instance_id) {
        return new Response(
          JSON.stringify({ error: "WhatsApp não configurado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!config.zapi_token) {
        return new Response(
          JSON.stringify({
            disconnected: false,
            code: "INSTANCE_TOKEN_MISSING",
            error: "O Token da Instância não foi preenchido. Salve o token real da instância UaZapi antes de desconectar.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (isInstanceTokenMisconfigured(config)) {
        return new Response(
          JSON.stringify({
            disconnected: false,
            code: "INSTANCE_TOKEN_MISCONFIGURED",
            error: "O campo 'Token da Instância' está com o Admin Token da UaZapi. Substitua esse valor pelo token real da instância para conseguir desconectar.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const disconnectResult = await disconnectUaZapiInstance(config);

      if (disconnectResult.ok) {
        return new Response(
          JSON.stringify({ disconnected: true, details: disconnectResult.payload }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.error("All disconnect attempts failed:", JSON.stringify(disconnectResult.failures));

      const invalidAdminToken = disconnectResult.failures.some((attempt) => {
        const message = String(attempt.payload?.message ?? "").toLowerCase();
        return attempt.status === 401 && message.includes("invalid token");
      });

      return new Response(
        JSON.stringify({
          disconnected: false,
          error: invalidAdminToken
            ? "Admin Token da UaZapi inválido ou rejeitado pelo endpoint de desconexão"
            : "Não foi possível desconectar a instância",
          attempts: disconnectResult.failures,
        }),
        { status: invalidAdminToken ? 400 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in zapi-qrcode:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
