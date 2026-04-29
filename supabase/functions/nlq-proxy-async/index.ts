// ============================================================
// nlq-proxy-async — Dispatcher JSON (assíncrono e durável)
// ============================================================
// Diferente do nlq-proxy (SSE legado), esta função:
// 1. Cria user + assistant(processing) em UMA transação via RPC.
// 2. Dispara o webhook do n8n com timeout de ACK curto (8s).
// 3. Retorna JSON imediatamente. Não espera o agente terminar.
// 4. O n8n é responsável por dar UPDATE final na assistant_message.
// 5. Watchdog (pg_cron 1min) marca como erro qualquer mensagem
//    presa em 'processing' por mais de 12 minutos.
//
// Payload enviado ao n8n NÃO contém service_role_key nem URL do
// Supabase. A service key fica como credencial interna no n8n.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const N8N_WEBHOOK_URL_ASYNC =
  Deno.env.get('N8N_WEBHOOK_URL_ASYNC') ??
  'https://webhook-nbl.golfine.com.br/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';

const ACK_TIMEOUT_MS = 8_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

interface DispatchBody {
  message: string;
  session_id: string;
  client_request_id: string;
  context?: Record<string, unknown>;
}

function validateBody(raw: unknown): { ok: true; data: DispatchBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Invalid body' };
  const r = raw as Record<string, unknown>;
  if (typeof r.message !== 'string' || r.message.trim().length === 0) {
    return { ok: false, error: 'message is required' };
  }
  if (r.message.length > 8000) {
    return { ok: false, error: 'message too long' };
  }
  if (!isUuid(r.session_id)) return { ok: false, error: 'session_id must be uuid' };
  if (typeof r.client_request_id !== 'string' || r.client_request_id.length === 0 || r.client_request_id.length > 128) {
    return { ok: false, error: 'client_request_id is required' };
  }
  const context = r.context && typeof r.context === 'object' ? (r.context as Record<string, unknown>) : undefined;
  return {
    ok: true,
    data: {
      message: r.message.trim(),
      session_id: r.session_id,
      client_request_id: r.client_request_id,
      context,
    },
  };
}

async function markAssistantError(
  serviceClient: ReturnType<typeof createClient>,
  assistant_message_id: string,
  request_id: string,
  session_id: string,
  user_message_id: string,
  detail: string
) {
  await serviceClient
    .from('chat_messages')
    .update({
      status: 'error',
      error_detail: detail,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', assistant_message_id)
    .eq('request_id', request_id)
    .eq('session_id', session_id)
    .eq('reply_to_message_id', user_message_id)
    .eq('status', 'processing');
}

async function markAckTimeout(
  serviceClient: ReturnType<typeof createClient>,
  assistant_message_id: string
) {
  await serviceClient
    .from('chat_messages')
    .update({ dispatch_ack_timeout: true, updated_at: new Date().toISOString() })
    .eq('id', assistant_message_id)
    .eq('status', 'processing');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonResponse({ error: 'Missing Authorization' }, 401);

  // User-scoped client (RLS aplica + auth.uid() na RPC)
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userInfo, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userInfo?.user) {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  // Service client (apenas para UPDATEs server-side de erro/ack)
  const serviceClient = createClient(
    SUPABASE_URL,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  const validated = validateBody(raw);
  if (!validated.ok) return jsonResponse({ error: validated.error }, 400);
  const { message, session_id, client_request_id, context } = validated.data;

  // RPC atômica: cria user + assistant(processing) ou retorna existentes
  const { data: rpcData, error: rpcErr } = await userClient.rpc(
    'create_chat_async_request',
    {
      p_session_id: session_id,
      p_content: message,
      p_client_request_id: client_request_id,
    }
  );

  if (rpcErr || !rpcData || (Array.isArray(rpcData) && rpcData.length === 0)) {
    console.error('[nlq-proxy-async] RPC error', rpcErr);
    return jsonResponse(
      { error: rpcErr?.message ?? 'Failed to create chat request' },
      rpcErr?.code === '42501' ? 403 : 500
    );
  }

  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as {
    user_message_id: string;
    assistant_message_id: string;
    request_id: string;
    assistant_status: string;
    is_duplicate: boolean;
  };

  // Se duplicata (mesmo client_request_id), não dispara n8n de novo
  if (row.is_duplicate) {
    return jsonResponse({
      user_message_id: row.user_message_id,
      assistant_message_id: row.assistant_message_id,
      request_id: row.request_id,
      status: row.assistant_status,
      is_duplicate: true,
    });
  }

  // Payload SEM service key, SEM URL do supabase
  const n8nPayload = {
    app: 'grafica_nbl_lovable',
    request_id: row.request_id,
    session_id,
    user_message_id: row.user_message_id,
    assistant_message_id: row.assistant_message_id,
    message,
    context: context ?? {},
    user: { id: userInfo.user.id, email: userInfo.user.email },
  };

  // Dispara n8n com timeout de ACK
  let ackTimeout = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ACK_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(N8N_WEBHOOK_URL_ASYNC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok) {
      // ACK 4xx/5xx → marca erro definitivo
      const text = await resp.text().catch(() => '');
      console.error('[nlq-proxy-async] n8n ACK error', resp.status, text);
      await markAssistantError(
        serviceClient,
        row.assistant_message_id,
        row.request_id,
        session_id,
        row.user_message_id,
        'Não foi possível iniciar o processamento. Tente novamente em instantes.'
      );
      return jsonResponse({
        user_message_id: row.user_message_id,
        assistant_message_id: row.assistant_message_id,
        request_id: row.request_id,
        status: 'error',
      });
    }
  } catch (err) {
    const isAbort = (err as Error)?.name === 'AbortError';
    if (isAbort) {
      // Timeout do ACK: ambíguo, NÃO marca erro — só sinaliza
      ackTimeout = true;
      console.warn('[nlq-proxy-async] n8n ACK timeout (8s) — keeping processing');
      await markAckTimeout(serviceClient, row.assistant_message_id);
    } else {
      console.error('[nlq-proxy-async] n8n dispatch error', err);
      await markAssistantError(
        serviceClient,
        row.assistant_message_id,
        row.request_id,
        session_id,
        row.user_message_id,
        'Falha ao se comunicar com o agente. Tente novamente.'
      );
      return jsonResponse({
        user_message_id: row.user_message_id,
        assistant_message_id: row.assistant_message_id,
        request_id: row.request_id,
        status: 'error',
      });
    }
  }

  return jsonResponse({
    user_message_id: row.user_message_id,
    assistant_message_id: row.assistant_message_id,
    request_id: row.request_id,
    status: 'processing',
    ack_timeout: ackTimeout || undefined,
  });
});
