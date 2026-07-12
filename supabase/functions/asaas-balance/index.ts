import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const ASAAS_URL = 'https://api.asaas.com/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const accessToken = authHeader.replace('Bearer ', '');
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: claims, error: cErr } = await supabase.auth.getClaims(accessToken);
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    // Only master/admin/member/financeiro should read this
    const { data: profileRow } = await supabase
      .from('profiles').select('operator_profile').eq('user_id', userId).maybeSingle();
    const { data: roles } = await supabase
      .from('user_roles').select('role').eq('user_id', userId);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    const op = (profileRow as any)?.operator_profile;
    const allowed = roleSet.has('admin') || roleSet.has('member') || op === 'master' || op === 'financeiro';
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ASAAS_ADVONE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ASAAS_ADVONE_API_KEY não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch(`${ASAAS_URL}/finance/balance`, {
      headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    });
    const body = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'asaas_error', status: resp.status, details: body }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(body);
    return new Response(JSON.stringify({ balance: Number(parsed.balance ?? 0) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
