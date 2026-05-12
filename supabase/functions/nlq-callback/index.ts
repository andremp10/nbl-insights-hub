// Public callback endpoint for n8n to deliver the agent's final answer.
// Security model: relies on the unguessable assistant_id (UUID v4) and
// only updates messages currently in 'processing'. Idempotent.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractText(body: any): string {
  if (typeof body?.reply === 'string') return body.reply;
  if (typeof body?.reply?.text === 'string') return body.reply.text;
  if (typeof body?.text === 'string') return body.text;
  if (typeof body?.output === 'string') return body.output;
  if (typeof body?.message === 'string') return body.message;
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: { code: 'METHOD', message: 'Method not allowed' } }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: { code: 'BAD_JSON', message: 'Invalid JSON' } }, 400);
  }

  const assistantId = typeof body?.assistant_id === 'string' ? body.assistant_id.trim() : '';
  if (!UUID_RE.test(assistantId)) {
    return json({ ok: false, error: { code: 'BAD_ID', message: 'assistant_id must be a UUID' } }, 400);
  }

  const rawStatus = typeof body?.status === 'string' ? body.status.toLowerCase() : 'complete';
  const status: 'complete' | 'error' = rawStatus === 'error' ? 'error' : 'complete';

  let replyText = extractText(body);
  let errorDetail: string | null = null;

  if (status === 'error') {
    errorDetail =
      (typeof body?.error === 'string' && body.error) ||
      (typeof body?.error?.message === 'string' && body.error.message) ||
      'O agente reportou um erro.';
    if (!replyText) replyText = errorDetail;
  } else if (!replyText || !replyText.trim()) {
    return json(
      { ok: false, error: { code: 'EMPTY_REPLY', message: 'reply text is required when status=complete' } },
      400,
    );
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: msg, error: selErr } = await admin
    .from('chat_messages')
    .select('id, status, role')
    .eq('id', assistantId)
    .maybeSingle();

  if (selErr) {
    console.error('[nlq-callback] select_failed', selErr);
    return json({ ok: false, error: { code: 'DB', message: 'DB error' } }, 500);
  }
  if (!msg) {
    console.warn('[nlq-callback] not_found', assistantId);
    return json({ ok: false, error: { code: 'NOT_FOUND', message: 'assistant_id not found' } }, 404);
  }
  if (msg.role !== 'assistant') {
    return json({ ok: false, error: { code: 'BAD_TARGET', message: 'target is not an assistant message' } }, 400);
  }
  if (msg.status !== 'processing') {
    console.log('[nlq-callback] duplicate', assistantId, msg.status);
    return json({ ok: true, duplicate: true, current_status: msg.status });
  }

  const { error: updErr } = await admin
    .from('chat_messages')
    .update({
      content: replyText,
      status,
      error_detail: errorDetail,
      completed_at: new Date().toISOString(),
    })
    .eq('id', assistantId)
    .eq('status', 'processing');

  if (updErr) {
    console.error('[nlq-callback] update_failed', updErr);
    return json({ ok: false, error: { code: 'UPDATE', message: 'Failed to update message' } }, 500);
  }

  console.log(`[nlq-callback] ok assistant=${assistantId} status=${status} len=${replyText.length}`);
  return json({ ok: true, assistant_id: assistantId, status });
});
