// Push de lead ganho pro ADVBOX (contato + caso)
// Chamado automaticamente por trigger DB no ganho, ou manualmente
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getErrorMessage } from "../_shared/errors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const accessToken = authHeader.replace("Bearer ", "").trim();
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(accessToken);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead_id, test_only } = await req.json();
    if (!lead_id || typeof lead_id !== "string") {
      return new Response(JSON.stringify({ error: "lead_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: lead } = await admin.from("leads")
      .select("id, company_id, name, phone, whatsapp, cpf, process_number, email, notes, case_type, niche")
      .eq("id", lead_id).maybeSingle();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin.from("advbox_configs")
      .select("*").eq("company_id", lead.company_id).maybeSingle();

    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ error: "Integração ADVBOX desativada para esta empresa" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payload ADVBOX (contato + caso). Formato baseado na documentação pública v1.
    const baseUrl = cfg.base_url.replace(/\/$/, "");
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${cfg.api_token}`,
    };

    const contactPayload = {
      name: lead.name,
      phone: lead.whatsapp || lead.phone,
      email: lead.email || undefined,
      cpf: lead.cpf || undefined,
      notes: `Importado do AdvOne (lead ${lead.id})${lead.notes ? `\n\n${lead.notes}` : ""}`,
    };

    if (test_only) {
      // Só valida credenciais consultando um endpoint leve
      const testResp = await fetch(`${baseUrl}/users/me`, { headers });
      const ok = testResp.ok;
      await admin.from("advbox_configs").update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: ok ? "ok" : "error",
        last_sync_error: ok ? null : `HTTP ${testResp.status}`,
      }).eq("id", cfg.id);
      return new Response(JSON.stringify({ success: ok, status: testResp.status }), {
        status: ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let advboxContactId: string | null = null;
    let errorMsg: string | null = null;

    try {
      const resp = await fetch(`${baseUrl}/contacts`, {
        method: "POST", headers, body: JSON.stringify(contactPayload),
      });
      const raw = await resp.text();
      if (!resp.ok) {
        errorMsg = `HTTP ${resp.status}: ${raw.substring(0, 300)}`;
      } else {
        try {
          const j = JSON.parse(raw);
          advboxContactId = String(j.id || j.data?.id || "");
        } catch { /* ignore */ }
      }
    } catch (e) {
      errorMsg = getErrorMessage(e, "Falha ao chamar ADVBOX");
    }

    await admin.from("advbox_push_log").insert({
      company_id: lead.company_id,
      lead_id: lead.id,
      entity_type: "contact",
      advbox_id: advboxContactId,
      status: errorMsg ? "error" : "success",
      error_message: errorMsg,
      payload: contactPayload,
    });

    await admin.from("advbox_configs").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: errorMsg ? "error" : "ok",
      last_sync_error: errorMsg,
    }).eq("id", cfg.id);

    return new Response(JSON.stringify({
      success: !errorMsg,
      advbox_contact_id: advboxContactId,
      error: errorMsg,
    }), {
      status: errorMsg ? 502 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("advbox-push-lead error:", e);
    return new Response(JSON.stringify({ error: getErrorMessage(e, "Erro desconhecido") }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
