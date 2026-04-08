import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ESCAVADOR_BASE = "https://api.escavador.com/api/v2";

async function escavadorFetch(path: string, method = "GET", body?: any) {
  const token = Deno.env.get("ESCAVADOR_API_TOKEN");
  if (!token) throw new Error("ESCAVADOR_API_TOKEN not configured");

  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${ESCAVADOR_BASE}${path}`, opts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Escavador ${res.status}: ${errText}`);
  }
  return res.json();
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getUserFromRequest(req: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data } = await supabase.auth.getUser(token);
  return data?.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = req.method === "POST" ? await req.json() : null;
    const admin = getSupabaseAdmin();

    switch (action) {
      // Search process by CNJ
      case "search": {
        const numero = body?.numero_cnj?.trim();
        if (!numero) throw new Error("numero_cnj obrigatório");
        const data = await escavadorFetch(`/processos/numero_cnj/${encodeURIComponent(numero)}`);
        return jsonResponse(data);
      }

      // Get movements
      case "movements": {
        const numero = body?.numero_cnj?.trim();
        if (!numero) throw new Error("numero_cnj obrigatório");
        const cursor = body?.cursor || "";
        const path = `/processos/numero_cnj/${encodeURIComponent(numero)}/movimentacoes${cursor ? `?cursor=${cursor}` : ""}`;
        const data = await escavadorFetch(path);
        return jsonResponse(data);
      }

      // Add process to monitoring
      case "add_process": {
        const { company_id, numero_cnj, client_name } = body;
        if (!company_id || !numero_cnj || !client_name) {
          throw new Error("company_id, numero_cnj e client_name obrigatórios");
        }

        // Check plan limits
        const { data: plan } = await admin
          .from("company_monitoring_plans")
          .select("max_processes, is_active")
          .eq("company_id", company_id)
          .maybeSingle();

        if (!plan || !plan.is_active) {
          throw new Error("Empresa não possui plano de monitoramento ativo");
        }

        const { count } = await admin
          .from("monitored_processes")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company_id)
          .eq("is_active", true);

        if ((count || 0) >= plan.max_processes) {
          throw new Error(`Limite de ${plan.max_processes} processos atingido`);
        }

        // Fetch process data from Escavador
        let processData: any = null;
        try {
          processData = await escavadorFetch(`/processos/numero_cnj/${encodeURIComponent(numero_cnj)}`);
        } catch (e) {
          // Process may not exist yet in Escavador, continue with basic data
          console.log("Process not found in Escavador, saving with basic data:", e.message);
        }

        const fonte = processData?.fontes?.[0];
        const capa = fonte?.capa;

        const insertData: any = {
          company_id,
          numero_cnj: numero_cnj.trim(),
          client_name,
          tribunal_sigla: fonte?.sigla || null,
          classe: capa?.classe || null,
          assunto: capa?.assunto || null,
          area: capa?.area || null,
          status_predito: fonte?.status_predito || null,
          polo_ativo: processData?.titulo_polo_ativo || null,
          polo_passivo: processData?.titulo_polo_passivo || null,
          data_inicio: processData?.data_inicio || null,
          data_ultima_movimentacao: processData?.data_ultima_movimentacao || null,
          quantidade_movimentacoes: processData?.quantidade_movimentacoes || 0,
          last_checked_at: new Date().toISOString(),
          escavador_data: processData || null,
        };

        const { data: inserted, error: insertError } = await admin
          .from("monitored_processes")
          .insert(insertData)
          .select()
          .single();

        if (insertError) throw new Error(insertError.message);

        // Fetch and save movements if process was found
        if (processData) {
          try {
            const movements = await escavadorFetch(
              `/processos/numero_cnj/${encodeURIComponent(numero_cnj)}/movimentacoes?limit=50`
            );
            if (movements?.items?.length) {
              const movRows = movements.items.map((m: any) => ({
                monitored_process_id: inserted.id,
                company_id,
                escavador_movement_id: m.id,
                movement_date: m.data,
                movement_type: m.tipo || "ANDAMENTO",
                content: m.conteudo,
                source_name: m.fonte?.nome || null,
                source_sigla: m.fonte?.sigla || null,
                source_grau: m.fonte?.grau || null,
                is_new: false,
              }));
              await admin.from("process_movements").insert(movRows);
            }
          } catch (e) {
            console.error("Error fetching movements:", e.message);
          }
        }

        return jsonResponse(inserted);
      }

      // Refresh process (fetch latest data)
      case "refresh": {
        const { process_id } = body;
        if (!process_id) throw new Error("process_id obrigatório");

        const { data: proc } = await admin
          .from("monitored_processes")
          .select("*")
          .eq("id", process_id)
          .single();

        if (!proc) throw new Error("Processo não encontrado");

        // Fetch latest data
        const processData = await escavadorFetch(
          `/processos/numero_cnj/${encodeURIComponent(proc.numero_cnj)}`
        );

        const fonte = processData?.fontes?.[0];
        const capa = fonte?.capa;

        await admin
          .from("monitored_processes")
          .update({
            tribunal_sigla: fonte?.sigla || proc.tribunal_sigla,
            classe: capa?.classe || proc.classe,
            assunto: capa?.assunto || proc.assunto,
            area: capa?.area || proc.area,
            status_predito: fonte?.status_predito || proc.status_predito,
            polo_ativo: processData?.titulo_polo_ativo || proc.polo_ativo,
            polo_passivo: processData?.titulo_polo_passivo || proc.polo_passivo,
            data_ultima_movimentacao: processData?.data_ultima_movimentacao || proc.data_ultima_movimentacao,
            quantidade_movimentacoes: processData?.quantidade_movimentacoes || proc.quantidade_movimentacoes,
            last_checked_at: new Date().toISOString(),
            escavador_data: processData,
          })
          .eq("id", process_id);

        // Fetch new movements
        const movements = await escavadorFetch(
          `/processos/numero_cnj/${encodeURIComponent(proc.numero_cnj)}/movimentacoes?limit=50`
        );

        if (movements?.items?.length) {
          for (const m of movements.items) {
            await admin.from("process_movements").upsert(
              {
                monitored_process_id: process_id,
                company_id: proc.company_id,
                escavador_movement_id: m.id,
                movement_date: m.data,
                movement_type: m.tipo || "ANDAMENTO",
                content: m.conteudo,
                source_name: m.fonte?.nome || null,
                source_sigla: m.fonte?.sigla || null,
                source_grau: m.fonte?.grau || null,
                is_new: true,
              },
              { onConflict: "monitored_process_id,escavador_movement_id", ignoreDuplicates: true }
            );
          }
        }

        return jsonResponse({ success: true });
      }

      // Remove from monitoring
      case "remove": {
        const { process_id: removeId } = body;
        if (!removeId) throw new Error("process_id obrigatório");

        await admin
          .from("monitored_processes")
          .update({ is_active: false })
          .eq("id", removeId);

        return jsonResponse({ success: true });
      }

      default:
        throw new Error("Ação inválida. Use: search, movements, add_process, refresh, remove");
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
