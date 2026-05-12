// Async chat proxy: returns 202 immediately, processes n8n in background.
// The assistant message starts as 'processing' and is UPDATEd via Realtime
// when the n8n webhook responds (can take up to ~9 minutes).
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const N8N_WEBHOOK_URL =
  'https://webhook-nbl.golfine.com.br/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';

// n8n only needs to ACK that it received the request. The final answer
// comes back asynchronously via the nlq-callback edge function.
const N8N_TIMEOUT_MS = 30_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Background: call n8n and update the assistant message in DB when done.
async function processInBackground(params: {
  admin: ReturnType<typeof createClient>;
  assistantId: string;
  sessionId: string;
  userId: string;
  message: string;
  context: unknown;
  timezone: string;
}) {
  const { admin, assistantId, sessionId, userId, message, context, timezone } = params;
  const startedAt = Date.now();
  const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/nlq-callback`;
  console.log(`[nlq-chat] bg_start assistant=${assistantId} session=${sessionId}`);

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), N8N_TIMEOUT_MS);
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
        assistant_id: assistantId,
        // n8n must POST the final answer here when the agent finishes.
        callback_url: callbackUrl,
      }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));

    const elapsed = Date.now() - startedAt;
    console.log(`[nlq-chat] bg_ack status=${resp.status} elapsed=${elapsed}ms`);

    // Drain body to free the connection; we don't use the immediate reply.
    await resp.text().catch(() => '');

    if (!resp.ok) {
      throw new Error(`n8n webhook returned ${resp.status}`);
    }
    // Success: leave the assistant message in 'processing'. The n8n
    // workflow will hit nlq-callback when it has the final answer.
  } catch (e: any) {
    const elapsed = Date.now() - startedAt;
    const errorDetail =
      e?.name === 'AbortError'
        ? 'Não foi possível disparar o agente (timeout no acknowledge).'
        : `Falha ao disparar o agente: ${e?.message ?? 'erro desconhecido'}`;
    console.error(`[nlq-chat] bg_fail elapsed=${elapsed}ms err=${e?.name ?? ''} msg=${e?.message ?? ''}`);

    const { error: updErr } = await admin
      .from('chat_messages')
      .update({
        content: errorDetail,
        status: 'error',
        error_detail: errorDetail,
        completed_at: new Date().toISOString(),
      })
      .eq('id', assistantId)
      .eq('status', 'processing');
    if (updErr) console.error('[nlq-chat] update_assistant_failed', updErr);
  }
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

  // ---- Body ----
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

  console.log(`[nlq-chat] request_in session=${sessionId} user=${userId} crid=${clientRequestId ?? '-'}`);

  // Idempotency: if user message with same client_request_id exists, return existing pair
  if (clientRequestId) {
    const { data: existing } = await admin
      .from('chat_messages')
      .select('id')
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
          status: assistantExisting.status,
          reply: { text: assistantExisting.content },
        });
      }
    }
  }

  // Insert user message
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

  // Insert assistant placeholder (processing)
  const { data: assistantMsg, error: aErr } = await admin
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: '',
      status: 'processing',
      reply_to_message_id: userMsg.id,
      processing_started_at: new Date().toISOString(),
    })
    .select('id, processing_started_at')
    .single();
  if (aErr || !assistantMsg) {
    console.error('insert assistant placeholder failed', aErr);
    return json({ error: 'Failed to create assistant placeholder' }, 500);
  }

  // Fire-and-forget: background n8n call
  // @ts-ignore EdgeRuntime is provided by Supabase Edge runtime
  EdgeRuntime.waitUntil(
    processInBackground({
      admin,
      assistantId: assistantMsg.id,
      sessionId,
      userId,
      message,
      context,
      timezone,
    }),
  );

  return json(
    {
      user_message_id: userMsg.id,
      assistant_id: assistantMsg.id,
      status: 'processing',
      processing_started_at: assistantMsg.processing_started_at,
    },
    202,
  );
});
