const N8N_WEBHOOK_URL = "https://primary-production-c00b.up.railway.app/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6";

const TIMEOUT_MS = 150000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Supabase Edge Function definition.
//
// Follow this format:
// - Deno: https://supabase.com/docs/guides/functions/deno
// - Typescript: https://supabase.com/docs/guides/functions/typescript
//
// Environment variables:
// - Follow this format:
//   - `SUPABASE_PROJECT_REF` - The Supabase project ref.
//   - `SUPABASE_ANON_KEY` - The Supabase anon key.
//   - `N8N_WEBHOOK_URL` - The n8n webhook URL.
//
// Input:
// - Follow this format:
//   - `session_id` - The session ID.
//   - `timezone` - The timezone.
//   - `message` - The message.
//   - `context` - The context.
//     - `date_range` - The date range.
//       - `from` - The from date.
//       - `to` - The to date.
//     - `active_module` - The active module.
//
// Output:
// - Follow this format:
//   - `ok` - The status.
//   - `reply` - The reply.
//     - `text` - The text.
//     - `highlights` - The highlights.
//       - `label` - The label.
//       - `value` - The value.
//     - `suggested_actions` - The suggested actions.
//       - `type` - The type.
//       - `from` - The from date.
//       - `to` - The to date.
//       - `module` - The module.
//     - `chart_payloads` - The chart payloads.
//       - `chart` - The chart.
//       - `title` - The title.
//       - `series` - The series.
//         - `name` - The name.
//         - `value` - The value.
//   - `error` - The error.
//     - `code` - The code.
//     - `message` - The message.

interface ChatRequest {
  session_id: string;
  timezone?: string;
  message: string;
  context?: {
    date_range?: { from: string; to: string };
    active_module?: string;
  };
}

interface ChatReply {
  text: string;
  highlights?: { label: string; value: number }[];
  suggested_actions?: { type: string; from?: string; to?: string; module?: string }[];
  chart_payloads?: Array<{ chart: string; title: string; series: { name: string; value: number }[] }>;
}

interface ChatResponse {
  ok: boolean;
  reply?: ChatReply;
  error?: { code: string; message: string };
}

const ERROR_MESSAGES: Record<string, string> = {
  TIMEOUT: 'O assistente demorou para responder. Por favor, tente uma pergunta mais simples.',
  UPSTREAM_ERROR: 'O assistente não conseguiu processar sua pergunta. Tente novamente.',
  BAD_RESPONSE: 'Resposta inesperada do assistente. Tente novamente.',
  BAD_REQUEST: 'Mensagem inválida. Por favor, digite sua pergunta.',
  NETWORK_ERROR: 'Erro de conexão com o assistente. Tente novamente em alguns instantes.',
};

function normalizeN8NResponse(rawData: string): ChatReply {
  const reply: ChatReply = { text: '', highlights: [], suggested_actions: [] };
  try {
    const parsed = JSON.parse(rawData);
    if (parsed.reply?.text) return { text: parsed.reply.text, highlights: parsed.reply.highlights || [], suggested_actions: parsed.reply.suggested_actions || [], chart_payloads: parsed.reply.chart_payloads };
    if (parsed.text) return { text: parsed.text, highlights: parsed.highlights || [], suggested_actions: parsed.suggested_actions || [], chart_payloads: parsed.chart_payloads };
    if (parsed.output) { reply.text = typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output); return reply; }
    if (typeof parsed === 'string') { reply.text = parsed; return reply; }
    reply.text = JSON.stringify(parsed, null, 2);
    return reply;
  } catch {
    reply.text = rawData || 'Resposta vazia do servidor.';
    return reply;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' } }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  try {
    const body: ChatRequest = await req.json();
    if (!body.message?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: { code: 'BAD_REQUEST', message: ERROR_MESSAGES.BAD_REQUEST } } as ChatResponse), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const n8nPayload = { app: 'grafica_nbl_lovable', session_id: body.session_id || 'anonymous', timezone: body.timezone || 'America/Fortaleza', message: body.message.trim(), context: body.context || {} };
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n8nPayload), signal: controller.signal });
      clearTimeout(timeoutId);
      if (!n8nResponse.ok) {
        return new Response(JSON.stringify({ ok: false, error: { code: 'UPSTREAM_ERROR', message: ERROR_MESSAGES.UPSTREAM_ERROR } } as ChatResponse), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const rawData = await n8nResponse.text();
      const reply = normalizeN8NResponse(rawData);
      return new Response(JSON.stringify({ ok: true, reply } as ChatResponse), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const isTimeout = fetchError instanceof Error && fetchError.name === 'AbortError';
      return new Response(JSON.stringify({ ok: false, error: { code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR', message: isTimeout ? ERROR_MESSAGES.TIMEOUT : ERROR_MESSAGES.NETWORK_ERROR } } as ChatResponse), { status: isTimeout ? 504 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: { code: 'BAD_RESPONSE', message: ERROR_MESSAGES.BAD_RESPONSE } } as ChatResponse), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
