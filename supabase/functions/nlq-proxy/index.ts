import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const N8N_WEBHOOK_URL = 'https://webhook-nbl.golfine.com.br/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const KEEPALIVE_INTERVAL_MS = 15_000;
const SIMULATED_CHUNK_SIZE = 80;
const SIMULATED_CHUNK_DELAY_MS = 15;

// ── Step detection patterns ──
interface StepPattern {
  regex: RegExp;
  label: string;
  skip?: boolean; // true = detect but don't emit a step
}

const STEP_PATTERNS: StepPattern[] = [
  { regex: /to=multi_tool_use/i, label: 'Analisando sua pergunta...' },
  { regex: /Calling agente_consulta/i, label: 'Consultando dados de pedidos...' },
  { regex: /Calling agente_financeiro/i, label: 'Consultando dados financeiros...' },
  { regex: /Calling\s+\w+/i, label: 'Consultando dados...' },
  { regex: /functions\.chat_historico/i, label: 'Verificando histórico...' },
  { regex: /functions\.Think/i, label: '', skip: true },
];

// ── Detect steps in a new text chunk ──
function detectSteps(newText: string): string[] {
  const detected: string[] = [];
  for (const pattern of STEP_PATTERNS) {
    if (pattern.regex.test(newText)) {
      if (!pattern.skip && pattern.label) {
        detected.push(pattern.label);
      }
    }
  }
  return detected;
}

// ── Extract final output from {"output":"..."} JSON wrapper ──
function extractFinalOutput(fullBuffer: string): string | null {
  // Look for the LAST occurrence of {"output":"..."}
  // The n8n "Respond to Webhook" node wraps the final answer in this format
  const lastBrace = fullBuffer.lastIndexOf('{"output"');
  if (lastBrace === -1) return null;

  const substr = fullBuffer.substring(lastBrace);
  try {
    const parsed = JSON.parse(substr);
    if (typeof parsed.output === 'string' && parsed.output.trim()) {
      return parsed.output.trim();
    }
  } catch {
    // The JSON might be split across chunks or malformed — try a regex fallback
    const match = substr.match(/\{"output"\s*:\s*"([\s\S]+)"\s*\}$/);
    if (match) {
      try {
        // Unescape JSON string
        return JSON.parse(`"${match[1]}"`);
      } catch { /* ignore */ }
    }
  }
  return null;
}

// ── Fallback: extract last meaningful text block when no {"output":...} found ──
function extractFallbackResponse(fullBuffer: string): string {
  // Remove known noise patterns
  let cleaned = fullBuffer;

  // Remove "Calling X with input: {...}" blocks
  cleaned = cleaned.replace(/Calling\s+\w+\s+with\s+input:\s*\{[^}]*\}/gi, '');
  // Remove "to=multi_tool_use..." lines
  cleaned = cleaned.replace(/to=multi_tool_use[^\n]*/gi, '');
  // Remove raw JSON objects that look like tool payloads
  cleaned = cleaned.replace(/\{"(Prompt_|tool_|Batch_)[^}]*\}/gi, '');
  // Remove ReAct traces
  cleaned = cleaned.replace(/^(Thought|Action|Observation):[^\n]*/gim, '');
  // Remove code block JSON
  cleaned = cleaned.replace(/```json[\s\S]*?```/g, '');

  // Take the last substantial block of text (likely the final answer)
  const blocks = cleaned.split(/\n{2,}/).map(b => b.trim()).filter(b => b.length > 20);
  if (blocks.length > 0) {
    return blocks[blocks.length - 1];
  }

  return cleaned.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { message, session_id } = await req.json();
    if (!message?.trim()) throw new Error('Mensagem vazia');
    if (!session_id) throw new Error('session_id obrigatório');

    const trimmedMessage = message.trim();

    // AUTH
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Session ownership
    const { data: sessionOwner, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionOwner || sessionOwner.user_id !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão não pertence ao usuário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Dedup
    const windowStart = new Date(Date.now() - 10000).toISOString();
    const { data: recentDuplicate } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('session_id', session_id)
      .eq('role', 'user')
      .eq('content', trimmedMessage)
      .gte('created_at', windowStart)
      .maybeSingle();

    if (recentDuplicate) {
      return new Response(
        JSON.stringify({ success: true, deduplicated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Insert user message
    const { data: userMsg, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({ session_id, role: 'user', content: trimmedMessage, status: 'complete' })
      .select('id')
      .single();

    if (userMsgError) throw userMsgError;

    // Context (last 10 messages)
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(10);

    const context = (history || []).reverse();

    // Call n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'grafica_nbl_lovable',
        message: trimmedMessage,
        session_id,
        user_message_id: userMsg.id,
        context,
        supabase_url: SUPABASE_URL,
        supabase_service_key: SUPABASE_SERVICE_ROLE_KEY,
      }),
    });

    if (!n8nResponse.ok) {
      const errBody = await n8nResponse.text();
      console.error('[nlq-proxy] n8n error:', n8nResponse.status, errBody);
      await supabase
        .from('chat_messages')
        .insert({ session_id, role: 'assistant', content: '', status: 'error', error_detail: `Webhook retornou ${n8nResponse.status}` });
      return new Response(
        JSON.stringify({ success: false, error: `n8n retornou ${n8nResponse.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // Non-streaming fallback (no body)
    if (!n8nResponse.body) {
      const text = await n8nResponse.text();
      let content = text.trim();
      // Try to extract from {"output":"..."}
      const extracted = extractFinalOutput(content);
      if (extracted) content = extracted;

      await supabase
        .from('chat_messages')
        .insert({ session_id, role: 'assistant', content, status: 'complete' });

      const encoder = new TextEncoder();
      const body = encoder.encode(
        `data: ${JSON.stringify({ type: 'token', token: content })}\n\ndata: ${JSON.stringify({ user_message_id: userMsg.id })}\n\ndata: [DONE]\n\n`
      );
      return new Response(body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    // ── Streaming: raw text-based parsing ──
    const reader = n8nResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullBuffer = '';
        const emittedSteps = new Set<string>();

        function emitSSE(data: Record<string, unknown>) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        function emitStep(label: string) {
          if (emittedSteps.has(label)) return;
          emittedSteps.add(label);
          emitSSE({ type: 'step', step: label });
        }

        // Send user_message_id immediately
        emitSSE({ user_message_id: userMsg.id });

        // Emit initial step
        emitStep('Analisando sua pergunta...');

        // Keepalive timer
        let lastEventTime = Date.now();
        const keepaliveTimer = setInterval(() => {
          if (Date.now() - lastEventTime >= KEEPALIVE_INTERVAL_MS) {
            try {
              emitSSE({ type: 'ping' });
              lastEventTime = Date.now();
            } catch { /* stream closed */ }
          }
        }, KEEPALIVE_INTERVAL_MS);

        try {
          // Read all chunks from n8n, accumulating and detecting steps
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullBuffer += chunk;
            lastEventTime = Date.now();

            // Detect steps in the new chunk
            const steps = detectSteps(chunk);
            for (const step of steps) {
              emitStep(step);
            }

            // Check for emoji-based steps (sub-agent responses)
            if (/^[📊📋🧠💡✅]/.test(chunk.trim())) {
              emitStep('Processando resultados...');
            }
          }

          // ── Stream finished: extract final output ──
          console.log('[nlq-proxy] Full buffer length:', fullBuffer.length);

          let finalContent = extractFinalOutput(fullBuffer);
          if (!finalContent) {
            console.warn('[nlq-proxy] No {"output":"..."} found, using fallback extraction');
            finalContent = extractFallbackResponse(fullBuffer);
          }

          if (!finalContent) {
            finalContent = 'Desculpe, não consegui processar sua solicitação. Tente novamente.';
          }

          // Emit "elaborating" step before sending tokens
          emitStep('Elaborando resposta final...');

          // Simulate streaming of the final content in chunks
          for (let i = 0; i < finalContent.length; i += SIMULATED_CHUNK_SIZE) {
            const tokenChunk = finalContent.substring(i, i + SIMULATED_CHUNK_SIZE);
            emitSSE({ type: 'token', token: tokenChunk });
            lastEventTime = Date.now();
            // Small delay to simulate typing effect
            if (i + SIMULATED_CHUNK_SIZE < finalContent.length) {
              await new Promise(r => setTimeout(r, SIMULATED_CHUNK_DELAY_MS));
            }
          }

          // Save clean content to database
          await supabase
            .from('chat_messages')
            .insert({ session_id, role: 'assistant', content: finalContent, status: 'complete' });

          clearInterval(keepaliveTimer);
          emitSSE({ type: 'done' });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          clearInterval(keepaliveTimer);
          console.error('[nlq-proxy] Stream error:', err);
          const errMsg = (err as Error).message || 'Erro no stream';
          await supabase
            .from('chat_messages')
            .insert({ session_id, role: 'assistant', content: '', status: 'error', error_detail: errMsg });
          emitSSE({ error: errMsg });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error) {
    console.error('[nlq-proxy] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
