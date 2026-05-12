// Synchronous chat proxy: front -> this function -> n8n webhook -> response
// No streaming, no async/polling. Returns final assistant message.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const N8N_WEBHOOK_URL =
  'https://webhook-nbl.golfine.com.br/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';

const N8N_TIMEOUT_MS = 55_000; // <60s para responder antes do timeout do supabase-js

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ---- Auth ----
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  const token = authHeader.slice('Bearer '.length);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  // ---- Parse & validate body ----
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const sessionId = typeof body?.session_id === 'string' ? body.session_id : null;
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const context = body?.context ?? null;
  const timezone = typeof body?.timezone === 'string' ? body.timezone : 'America/Fortaleza';
  const clientRequestId =
    typeof body?.client_request_id === 'string' && body.client_request_id.length > 0
      ? body.client_request_id
      : null;

  if (!sessionId || !message) return json({ error: 'session_id and message are required' }, 400);
  if (message.length > 4000) return json({ error: 'message too long' }, 400);

  // service-role client for privileged DB ops (validated against userId manually)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Validate session ownership
  const { data: session, error: sessErr } = await admin
    .from('chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .single();
  if (sessErr || !session || session.user_id !== userId) {
    return json({ error: 'Session not found' }, 404);
  }

  // Idempotency: if user message with same client_request_id exists, return existing pair
  if (clientRequestId) {
    const { data: existing } = await admin
      .from('chat_messages')
      .select('id, content')
      .eq('session_id', sessionId)
      .eq('client_request_id', clientRequestId)
      .eq('role', 'user')
      .maybeSingle();
    if (existing) {
      const { data: assistantExisting } = await admin
        .from('chat_messages')
        .select('id, content, status, error_detail')
        .eq('session_id', sessionId)
        .eq('reply_to_message_id', existing.id)
        .eq('role', 'assistant')
        .maybeSingle();
      if (assistantExisting) {
        return json({
          duplicate: true,
          user_message_id: existing.id,
          assistant_id: assistantExisting.id,
          reply: { text: assistantExisting.content },
          status: assistantExisting.status,
        });
      }
    }
  }

  // Insert user message (complete)
  const { data: userMsg, error: userMsgErr } = await admin
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content: message,
      status: 'complete',
      client_request_id: clientRequestId,
    })
    .select('id')
    .single();
  if (userMsgErr || !userMsg) {
    console.error('insert user message failed', userMsgErr);
    return json({ error: 'Failed to save user message' }, 500);
  }

  // Call n8n synchronously
  let replyText = '';
  let assistantStatus: 'complete' | 'error' = 'complete';
  let errorDetail: string | null = null;
  let extras: Record<string, unknown> = {};
  const startedAt = Date.now();

  console.log(`[nlq-chat] request_in session=${sessionId} user=${userId} crid=${clientRequestId ?? '-'}`);

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), N8N_TIMEOUT_MS);
    console.log(`[nlq-chat] n8n_post url=${N8N_WEBHOOK_URL}`);
    const resp = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'grafica_nbl_lovable',
        session_id: sessionId,
        user_id: userId,
        timezone,
        message,
        context,
      }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));

    const elapsed = Date.now() - startedAt;
    console.log(`[nlq-chat] n8n_done status=${resp.status} elapsed=${elapsed}ms`);

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`n8n ${resp.status}: ${txt.slice(0, 200)}`);
    }

    const raw = await resp.text();
    let payload: any = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      replyText = raw.trim();
    }

    if (payload) {
      if (payload.ok === false) {
        assistantStatus = 'error';
        errorDetail = payload?.error?.message || 'Resposta inválida do agente.';
        replyText = errorDetail!;
      } else {
        replyText =
          payload?.reply?.text ??
          payload?.output ??
          payload?.text ??
          payload?.message ??
          (typeof payload === 'string' ? payload : '');
        if (payload?.reply?.highlights) extras.highlights = payload.reply.highlights;
        if (payload?.reply?.suggested_actions) extras.suggested_actions = payload.reply.suggested_actions;
        if (payload?.reply?.chart_payloads) extras.chart_payloads = payload.reply.chart_payloads;
      }
    }

    if (!replyText || replyText.trim().length === 0) {
      assistantStatus = 'error';
      errorDetail = 'O agente não retornou conteúdo.';
      replyText = errorDetail;
    }
  } catch (e: any) {
    const elapsed = Date.now() - startedAt;
    assistantStatus = 'error';
    if (e?.name === 'AbortError') {
      errorDetail = `O agente do n8n não respondeu em ${Math.round(N8N_TIMEOUT_MS / 1000)}s. Verifique se o workflow está ativo no n8n.`;
    } else {
      errorDetail = `Falha ao consultar o agente: ${e?.message ?? 'erro desconhecido'}`;
    }
    replyText = errorDetail;
    console.error(`[nlq-chat] n8n_fail elapsed=${elapsed}ms err=${e?.name ?? ''} msg=${e?.message ?? ''}`);
  }

  // Insert assistant message
  const { data: assistantMsg, error: aErr } = await admin
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: replyText,
      status: assistantStatus,
      error_detail: errorDetail,
      reply_to_message_id: userMsg.id,
      completed_at: new Date().toISOString(),
    })
    .select('id, content, status, error_detail, created_at')
    .single();

  if (aErr || !assistantMsg) {
    console.error('insert assistant message failed', aErr);
    return json({ error: 'Failed to save assistant message' }, 500);
  }

  return json({
    user_message_id: userMsg.id,
    assistant_id: assistantMsg.id,
    reply: { text: replyText, ...extras },
    status: assistantStatus,
    error_detail: errorDetail,
  });
});
