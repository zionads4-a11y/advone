import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(accessToken);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Caller role
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const roles = (callerRoles ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("member");
    const isGerente = roles.includes("gerente");

    if (!isAdmin && !isGerente) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const target_user_id: string | undefined = body.target_user_id;
    const new_password: string | undefined = body.new_password;

    if (!target_user_id || !new_password || typeof new_password !== "string") {
      return new Response(JSON.stringify({ error: "target_user_id e new_password são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new_password.length < 8) {
      return new Response(JSON.stringify({ error: "A senha precisa ter pelo menos 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gerente só pode resetar senha de usuários da própria empresa
    if (!isAdmin && isGerente) {
      const { data: myCompanies } = await admin
        .from("client_companies")
        .select("company_id")
        .eq("user_id", callerId);
      const myIds = (myCompanies ?? []).map((c) => c.company_id);
      const { data: targetCompanies } = await admin
        .from("client_companies")
        .select("company_id")
        .eq("user_id", target_user_id);
      const targetIds = (targetCompanies ?? []).map((c) => c.company_id);
      const shares = targetIds.some((id) => myIds.includes(id));
      if (!shares) {
        return new Response(JSON.stringify({ error: "Você só pode redefinir senha de usuários da sua empresa" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // E não pode mexer em admin/member/gerente
      const { data: targetRoles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", target_user_id);
      const tRoles = (targetRoles ?? []).map((r) => r.role);
      if (tRoles.some((r) => ["admin", "member", "gerente"].includes(r))) {
        return new Response(JSON.stringify({ error: "Sem permissão para esse usuário" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(target_user_id, {
      password: new_password,
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
