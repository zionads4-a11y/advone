// Testa credenciais Meta Cloud API para uma empresa
// Chama GET /{phone_number_id} para validar token + phone id.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData } = await callerClient.auth.getClaims(authHeader.replace("Bearer ", "").trim());
    const userId = claimsData?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { company_id } = body;
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Admin/member bypass: precisam poder testar qualquer empresa
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "member");

    if (!isAdmin) {
      const { data: membership } = await admin
        .from("client_companies")
        .select("id").eq("user_id", userId).eq("company_id", company_id).maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: cfg } = await admin
      .from("whatsapp_configs")
      .select("meta_phone_number_id, meta_access_token")
      .eq("company_id", company_id).maybeSingle();

    const token = cfg?.meta_access_token || Deno.env.get("META_PERMANENT_ACCESS_TOKEN");
    if (!cfg?.meta_phone_number_id || !token) {
      return new Response(JSON.stringify({ error: "credenciais Meta não configuradas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${cfg.meta_phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const json = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: json?.error?.message || "erro Meta", details: json }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // marca conectado
    await admin.from("whatsapp_configs")
      .update({ status: "connected", phone_number: json.display_phone_number || null })
      .eq("company_id", company_id);

    return new Response(JSON.stringify({ ok: true, info: json }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[meta-test-connection]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
