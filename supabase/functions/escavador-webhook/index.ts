// Webhook público que recebe callbacks do Escavador V2 quando há novas
// movimentações nos processos monitorados. Atualiza process_movements
// em tempo real e dispara alerta WhatsApp para a empresa dona do processo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function sendWhatsappAlert(companyId: string, numeroCnj: string, clientName: string | null, count: number) {
  try {
    const sb = admin();
    const { data: cfg } = await sb
      .from("whatsapp_configs")
      .select("zapi_instance_id, zapi_token, alert_whatsapp")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!cfg?.alert_whatsapp || !cfg.zapi_instance_id) return;
    const phone = cfg.alert_whatsapp.replace(/\D/g, "");
    const msg =
      `⚖️ *Movimentação processual em tempo real*\n\n` +
      `📋 *Processo:* ${numeroCnj}\n` +
      (clientName ? `👤 *Cliente:* ${clientName}\n` : "") +
      `📌 *${count} nova(s) movimentação(ões)* detectada(s) pelo tribunal\n\n` +
      `Acesse o sistema para ver os detalhes.`;

    await fetch(
      `https://ziondigital.uazapi.com/instance/send-text/${cfg.zapi_instance_id}?token=${cfg.zapi_token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: msg }),
      }
    );
  } catch (e) {
    console.error("WhatsApp alert error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    console.log("Escavador callback received:", JSON.stringify(payload).slice(0, 500));

    // Escavador V2 entrega payloads no formato:
    // { numero_cnj, monitoramento_id, movimentacoes: [{id, data, tipo, conteudo, fonte:{...}}, ...] }
    // ou pode entregar item único. Vamos normalizar.
    const items: any[] = Array.isArray(payload?.eventos)
      ? payload.eventos
      : Array.isArray(payload) ? payload : [payload];

    const sb = admin();
    let totalNew = 0;

    for (const ev of items) {
      const numeroCnj: string | undefined = ev?.numero_cnj || ev?.processo?.numero_cnj;
      const monitoramentoId: number | undefined = ev?.monitoramento_id || ev?.id_monitoramento;
      const movs: any[] = ev?.movimentacoes || ev?.itens || [];

      if (!numeroCnj && !monitoramentoId) continue;

      // localiza processo monitorado (por monitoring_id OU CNJ)
      let q = sb.from("monitored_processes").select("id, company_id, client_name, numero_cnj").eq("is_active", true);
      if (monitoramentoId) q = q.eq("escavador_monitoring_id", monitoramentoId);
      else q = q.eq("numero_cnj", numeroCnj!);

      const { data: procs } = await q;
      if (!procs?.length) {
        console.warn("Processo não encontrado para callback:", numeroCnj, monitoramentoId);
        continue;
      }

      for (const proc of procs) {
        if (movs.length === 0) {
          // sem detalhe — apenas marca last_checked
          await sb.from("monitored_processes")
            .update({ last_checked_at: new Date().toISOString() })
            .eq("id", proc.id);
          continue;
        }

        const rows = movs.map((m: any) => ({
          monitored_process_id: proc.id,
          company_id: proc.company_id,
          escavador_movement_id: m.id,
          movement_date: m.data || m.movement_date,
          movement_type: m.tipo || "ANDAMENTO",
          content: m.conteudo || m.content,
          source_name: m.fonte?.nome || null,
          source_sigla: m.fonte?.sigla || null,
          source_grau: m.fonte?.grau || null,
          is_new: true,
        }));

        const { data: inserted } = await sb
          .from("process_movements")
          .upsert(rows, { onConflict: "monitored_process_id,escavador_movement_id", ignoreDuplicates: true })
          .select("id");

        const insertedCount = inserted?.length || 0;
        totalNew += insertedCount;

        await sb.from("monitored_processes")
          .update({
            last_checked_at: new Date().toISOString(),
            data_ultima_movimentacao: rows[0]?.movement_date || null,
          })
          .eq("id", proc.id);

        if (insertedCount > 0) {
          await sendWhatsappAlert(proc.company_id, proc.numero_cnj, proc.client_name, insertedCount);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: totalNew }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Escavador webhook error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, // 200 para evitar retentativas em loop em caso de payload malformado
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
