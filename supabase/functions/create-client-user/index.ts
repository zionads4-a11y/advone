import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get caller ID from token using getClaims
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const accessToken = authHeader.replace("Bearer ", "").trim();
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(accessToken);
    const callerId = claimsData?.claims?.sub;

    if (claimsError || !callerId || typeof callerId !== "string") {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller's role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    const callerRole = roleData?.role;

    const { email, full_name, company_id, role: targetRole, job_title } = await req.json();

    if (!email || !full_name || !company_id) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, full_name, company_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gera senha temporária aleatória forte (não aceita senha vinda do cliente)
    const generateTempPassword = () => {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      const base = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
      return `Tmp!${base.slice(0, 12)}`;
    };
    const password = generateTempPassword();

    // Determine valid role based on caller
    let assignedRole: string;

    if (callerRole === "admin") {
      // Admin can create gerente or operador (defaults to gerente)
      assignedRole = targetRole === "operador" ? "operador" : "gerente";
    } else if (callerRole === "gerente") {
      // Gerente can only create operador in their own company
      const { data: callerCompany } = await adminClient
        .from("client_companies")
        .select("company_id")
        .eq("user_id", callerId)
        .maybeSingle();

      if (!callerCompany || callerCompany.company_id !== company_id) {
        return new Response(JSON.stringify({ error: "Você só pode criar usuários na sua própria empresa" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      assignedRole = "operador"; // Gerente can only create operadores
    } else {
      return new Response(JSON.stringify({ error: "Apenas administradores e gerentes podem criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the user with admin client
    console.log("Creating user with email:", email, "role:", assignedRole, "company:", company_id);
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      console.error("Error creating user:", createError.message);
      const friendlyMsg = createError.message.includes("already been registered")
        ? "Este email já está cadastrado no sistema"
        : "Erro ao criar usuário: " + createError.message;
      return new Response(JSON.stringify({ error: friendlyMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = userData.user.id;

    // The trigger creates profile and assigns 'member' role by default
    // Update role to the target role
    await adminClient.from("user_roles").update({ role: assignedRole }).eq("user_id", newUserId);

    // Link user to company
    await adminClient.from("client_companies").insert({
      user_id: newUserId,
      company_id,
    });

    // Save job_title (cargo/função visual) on profile when provided
    if (job_title && typeof job_title === "string") {
      await adminClient
        .from("profiles")
        .update({ job_title })
        .eq("user_id", newUserId);
    }

    const roleLabel = assignedRole === "gerente" ? "Gerente" : "Operador";

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId, role: assignedRole, message: `${roleLabel} criado com sucesso` }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating client:", error);
    const errorMessage = getErrorMessage(error, "Erro desconhecido");
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
