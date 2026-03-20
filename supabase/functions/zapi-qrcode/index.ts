import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

      // Fetch QR code from Z-API
      const qrResponse = await fetch(
        `https://api.z-api.io/instances/${config.zapi_instance_id}/token/${config.zapi_token}/qr-code`,
        { method: "GET" }
      );

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text();
        console.error("Z-API QR code error:", errorText);
        return new Response(
          JSON.stringify({ error: "Erro ao obter QR Code da Z-API", details: errorText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qrData = await qrResponse.json();

      return new Response(
        JSON.stringify({
          qrcode: qrData.value || qrData,
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

      if (!config) {
        return new Response(
          JSON.stringify({ error: "Z-API não configurada", connected: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN") || "";
      const SERVER_URL = "https://ziondigital.uazapi.com";

      try {
        const statusResponse = await fetch(
          `${SERVER_URL}/instance/${config.zapi_instance_id}/status`,
          { method: "GET", headers: { "AdminToken": ADMIN_TOKEN } }
        );
        const statusData = await statusResponse.json();
        const connected = statusData?.state === "open" || statusData?.connected === true;

        return new Response(
          JSON.stringify({ connected, status: statusData }),
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

      if (!config) {
        return new Response(
          JSON.stringify({ error: "Z-API não configurada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qrResponse = await fetch(
        `https://api.z-api.io/instances/${config.zapi_instance_id}/token/${config.zapi_token}/qr-code`,
        { method: "GET" }
      );

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text();
        console.error("Z-API QR code error:", errorText);
        return new Response(
          JSON.stringify({ error: "Erro ao obter QR Code", details: errorText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qrData = await qrResponse.json();

      return new Response(
        JSON.stringify({ qrcode: qrData.value || qrData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida. Use 'get_qrcode' ou 'generate_link'" }),
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
