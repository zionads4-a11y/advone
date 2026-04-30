import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

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

    // ---- Authorization helpers ----
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const isAdmin = roleRow?.role === "admin" || roleRow?.role === "member";
    const { data: memberships } = await admin.from("client_companies").select("company_id").eq("user_id", user.id);
    const userCompanyIds = new Set((memberships || []).map((m: any) => m.company_id));

    const assertCompanyAccess = (cid: string | null | undefined) => {
      if (!cid) throw new Error("company_id obrigatório");
      if (!isAdmin && !userCompanyIds.has(cid)) {
        throw new Error("Acesso negado a esta empresa");
      }
    };
    const assertProcessAccess = async (pid: string) => {
      if (!pid) throw new Error("process_id obrigatório");
      const { data: proc } = await admin.from("monitored_processes").select("company_id").eq("id", pid).maybeSingle();
      if (!proc) throw new Error("Processo não encontrado");
      assertCompanyAccess(proc.company_id);
    };

    if (action === "add_process") assertCompanyAccess(body?.company_id);
    if (action === "refresh") await assertProcessAccess(body?.process_id);
    if (action === "remove") await assertProcessAccess(body?.process_id);
    if (action === "register_callbacks" && !isAdmin) {
      throw new Error("Apenas admins podem executar register_callbacks");
    }

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

      // Add process to monitoring (cobrança R$3,50/mês por processo ativo, sem limite)
      case "add_process": {
        const { company_id, numero_cnj, client_name, tribunal } = body;
        if (!company_id || !numero_cnj || !client_name) {
          throw new Error("company_id, numero_cnj e client_name obrigatórios");
        }

        // URL pública do nosso webhook que o Escavador irá chamar a cada movimentação
        const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/escavador-webhook`;

        // Register monitoring on Escavador V2 with real-time callback
        const monitoringBody: any = {
          numero_cnj: numero_cnj.trim(),
          frequencia: "DIARIA",
          urls_de_callback: [callbackUrl],
        };
        if (tribunal) {
          monitoringBody.tribunal = tribunal;
        }

        let escavadorMonitoring: any = null;
        let escavadorMonitoringId: number | null = null;
        let callbackRegisteredAt: string | null = null;
        try {
          escavadorMonitoring = await escavadorFetch("/processos/monitorar", "POST", monitoringBody);
          console.log("Escavador monitoring registered:", JSON.stringify(escavadorMonitoring));
          escavadorMonitoringId =
            escavadorMonitoring?.id ||
            escavadorMonitoring?.monitoramento?.id ||
            escavadorMonitoring?.data?.id ||
            null;
          callbackRegisteredAt = new Date().toISOString();
        } catch (e) {
          console.error("Error registering monitoring on Escavador:", getErrorMessage(e));
          // Continue - save locally even if Escavador registration fails
        }

        // Fetch process data from Escavador
        let processData: any = null;
        try {
          processData = await escavadorFetch(`/processos/numero_cnj/${encodeURIComponent(numero_cnj)}`);
        } catch (e) {
          console.log("Process not found in Escavador, saving with basic data:", getErrorMessage(e));
        }

        const fonte = processData?.fontes?.[0];
        const capa = fonte?.capa;

        const insertData: any = {
          company_id,
          numero_cnj: numero_cnj.trim(),
          client_name,
          tribunal_sigla: tribunal || fonte?.sigla || null,
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
          escavador_monitoring_id: escavadorMonitoringId,
          callback_registered_at: callbackRegisteredAt,
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
            console.error("Error fetching movements:", getErrorMessage(e));
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

        let newMovementsCount = 0;
        if (movements?.items?.length) {
          for (const m of movements.items) {
            const { data: upserted } = await admin.from("process_movements").upsert(
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
            ).select("id");
            if (upserted?.length) newMovementsCount++;
          }
        }

        // Send WhatsApp alert if new movements found
        if (newMovementsCount > 0) {
          try {
            const { data: whatsappConfig } = await admin
              .from("whatsapp_configs")
              .select("zapi_instance_id, zapi_token, alert_whatsapp")
              .eq("company_id", proc.company_id)
              .maybeSingle();

            if (whatsappConfig?.alert_whatsapp && whatsappConfig.zapi_instance_id) {
              const alertPhone = whatsappConfig.alert_whatsapp.replace(/\D/g, "");
              const alertMsg = `⚖️ *Alerta de Movimentação Processual*\n\n` +
                `📋 *Processo:* ${proc.numero_cnj}\n` +
                `👤 *Cliente:* ${proc.client_name}\n` +
                `📌 *${newMovementsCount} nova(s) movimentação(ões)* detectada(s)\n\n` +
                `Acesse o sistema para visualizar os detalhes.`;

              const serverUrl = "https://ziondigital.uazapi.com";
              await fetch(
                `${serverUrl}/instance/send-text/${whatsappConfig.zapi_instance_id}?token=${whatsappConfig.zapi_token}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ phone: alertPhone, message: alertMsg }),
                }
              );
              console.log(`WhatsApp alert sent to ${alertPhone} for process ${proc.numero_cnj}`);
            }
          } catch (e) {
            console.error("Error sending WhatsApp movement alert:", getErrorMessage(e));
          }
        }

        return jsonResponse({ success: true, newMovements: newMovementsCount });
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

      // Backfill: registra callback V2 para processos já existentes que ainda
      // não têm escavador_monitoring_id (re-registra monitoramento com URL de callback).
      case "register_callbacks": {
        const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/escavador-webhook`;
        const { data: pending } = await admin
          .from("monitored_processes")
          .select("id, numero_cnj, tribunal_sigla")
          .eq("is_active", true)
          .is("escavador_monitoring_id", null);

        let registered = 0;
        let failed = 0;
        for (const p of pending || []) {
          try {
            const monitoringBody: any = {
              numero_cnj: p.numero_cnj,
              frequencia: "DIARIA",
              urls_de_callback: [callbackUrl],
            };
            if (p.tribunal_sigla) monitoringBody.tribunal = p.tribunal_sigla;

            const r = await escavadorFetch("/processos/monitorar", "POST", monitoringBody);
            const monId = r?.id || r?.monitoramento?.id || r?.data?.id || null;
            await admin.from("monitored_processes").update({
              escavador_monitoring_id: monId,
              callback_registered_at: new Date().toISOString(),
            }).eq("id", p.id);
            registered++;
          } catch (e) {
            console.error("Failed to register callback for", p.numero_cnj, getErrorMessage(e));
            failed++;
          }
        }
        return jsonResponse({ success: true, registered, failed, total: pending?.length || 0 });
      }

      default:
        throw new Error("Ação inválida. Use: search, movements, add_process, refresh, remove, register_callbacks");
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
