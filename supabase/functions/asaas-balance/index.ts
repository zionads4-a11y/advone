import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const url = (env: string) => env === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const accessToken = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
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

    // Perfil autorizado
    const [{ data: profileRow }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('operator_profile').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    const op = (profileRow as any)?.operator_profile;
    const allowed = roleSet.has('admin') || roleSet.has('member')
      || roleSet.has('gerente') || op === 'master' || op === 'financeiro';
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Empresa: query param ?company_id=… ou primeira empresa vinculada
    const paramsUrl = new URL(req.url);
    let companyId = paramsUrl.searchParams.get('company_id');
    if (!companyId) {
      const { data: cc } = await supabase.from('client_companies')
        .select('company_id').eq('user_id', userId).limit(1).maybeSingle();
      companyId = (cc as any)?.company_id ?? null;
    }
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'no_company' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Config Asaas da empresa
    const { data: cfg } = await supabase.from('asaas_configs')
      .select('api_key, environment').eq('company_id', companyId).maybeSingle();
    const apiKey = (cfg as any)?.api_key;
    const env = (cfg as any)?.environment ?? 'sandbox';
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'no_asaas_config',
        message: 'Este escritório ainda não configurou o Asaas.',
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resp = await fetch(`${url(env)}/finance/balance`, {
      headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    });
    const body = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'asaas_error', status: resp.status, details: body }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = JSON.parse(body);
    return new Response(JSON.stringify({ balance: Number(parsed.balance ?? 0), environment: env }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
