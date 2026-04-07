import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.3/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token não fornecido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar config Asaas
    const { data: config, error: configErr } = await supabase
      .from("asaas_configs")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (configErr || !config) {
      return new Response(JSON.stringify({ error: "Configuração Asaas não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = config.environment === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3";

    // Buscar pagamentos recebidos do Asaas
    let offset = 0;
    let hasMore = true;
    let synced = 0;

    while (hasMore) {
      const res = await fetch(`${baseUrl}/payments?offset=${offset}&limit=100&status=RECEIVED`, {
        headers: { "access_token": config.api_key },
      });

      if (!res.ok) {
        const errBody = await res.text();
        return new Response(JSON.stringify({ error: `Erro Asaas: ${res.status}`, details: errBody }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const payments = data.data || [];

      for (const payment of payments) {
        // Upsert: se já existe pelo asaas_payment_id, atualiza
        const { error: upsertErr } = await supabase
          .from("financial_transactions")
          .upsert({
            company_id,
            type: "receivable",
            description: payment.description || `Pagamento Asaas #${payment.id}`,
            amount: payment.value,
            due_date: payment.dueDate,
            paid_date: payment.paymentDate || payment.confirmedDate,
            status: "paid",
            category: "Asaas",
            asaas_payment_id: payment.id,
            created_by: user.id,
          }, { onConflict: "asaas_payment_id" })
          .select();

        if (!upsertErr) synced++;
      }

      hasMore = data.hasMore;
      offset += 100;
    }

    // Buscar pagamentos pendentes também
    offset = 0;
    hasMore = true;
    while (hasMore) {
      const res = await fetch(`${baseUrl}/payments?offset=${offset}&limit=100&status=PENDING`, {
        headers: { "access_token": config.api_key },
      });
      if (!res.ok) break;

      const data = await res.json();
      const payments = data.data || [];

      for (const payment of payments) {
        const { error: upsertErr } = await supabase
          .from("financial_transactions")
          .upsert({
            company_id,
            type: "receivable",
            description: payment.description || `Pagamento Asaas #${payment.id}`,
            amount: payment.value,
            due_date: payment.dueDate,
            paid_date: null,
            status: "pending",
            category: "Asaas",
            asaas_payment_id: payment.id,
            created_by: user.id,
          }, { onConflict: "asaas_payment_id" })
          .select();

        if (!upsertErr) synced++;
      }

      hasMore = data.hasMore;
      offset += 100;
    }

    // Atualizar last_sync_at
    await supabase
      .from("asaas_configs")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("company_id", company_id);

    return new Response(JSON.stringify({ success: true, synced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
