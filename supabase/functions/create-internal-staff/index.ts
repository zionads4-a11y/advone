import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: claims } = await caller.auth.getClaims(token);
    const callerId = claims?.claims?.sub;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem criar funcionários internos" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { email, full_name, job_title, modules } = body ?? {};
    if (!email || !full_name || !Array.isArray(modules)) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, full_name, modules[]" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const genPwd = () => {
      const b = new Uint8Array(12); crypto.getRandomValues(b);
      return `AdvOne!${btoa(String.fromCharCode(...b)).replace(/[+/=]/g, "").slice(0, 10)}`;
    };
    const password = genPwd();

    const { data: userData, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });
    if (createErr) {
      const msg = createErr.message.includes("already been registered") ? "Este e-mail já está cadastrado" : createErr.message;
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const newId = userData.user.id;

    await admin.from("user_roles").update({ role: "member" }).eq("user_id", newId);
    await admin.from("profiles").update({
      is_internal_staff: true,
      internal_job_title: job_title || null,
      full_name,
    }).eq("user_id", newId);

    if (modules.length) {
      await admin.from("internal_staff_permissions").insert(
        modules.map((m: string) => ({ user_id: newId, module: m, granted: true, granted_by: callerId })),
      );
    }

    return new Response(JSON.stringify({ success: true, user_id: newId, temp_password: password }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
