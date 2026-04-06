import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const N8N_WEBHOOK_URL = 'https://webhook-nbl.golfine.com.br/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const KEEPALIVE_INTERVAL_MS = 10_000;
const SIMULATED_CHUNK_SIZE = 80;
const SIMULATED_CHUNK_DELAY_MS = 10;
const N8N_FETCH_TIMEOUT_MS = 360_000; // 6 min timeout for n8n fetch

// ── Step detection on text content ──
function detectStepsInText(text: string): string[] {
  const matches: string[] = [];
  if (/to=multi_tool_use/i.test(text)) matches.push('Analisando sua pergunta...');
  if (/Calling agente_consulta/i.test(text)) matches.push('Consultando dados de pedidos...');
  if (/Calling agente_financeiro/i.test(text)) matches.push('Consultando dados financeiros...');
  if (/Calling\s+\w+/i.test(text) && matches.length === 0) matches.push('Consultando dados...');
  if (/functions\.chat_historico/i.test(text)) matches.push('Verificando histórico...');
  if (/[📊📋🧠💡✅]/.test(text)) matches.push('Processando resultados...');
  return matches;
}

function nodeToStepLabel(nodeName: string, agentBeginCount: number): string | null {
  const lower = nodeName.toLowerCase();
  if (lower.includes('agente_consulta')) return 'Consultando dados de pedidos...';
  if (lower.includes('agente_financeiro')) return 'Consultando dados financeiros...';
  if (lower.includes('supabase') || lower.includes('tool')) return 'Acessando banco de dados...';
  if (lower.includes('agente_negocio') || lower.includes('agente')) {
    return agentBeginCount <= 1 ? 'Analisando sua pergunta...' : 'Elaborando resposta...';
  }
  return 'Processando...';
}

function isInternalAgentNoise(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^Calling \w+ with input:/i.test(t)) return true;
  if (/^```json\s*\{/.test(t)) return true;
  if (/^\{"Prompt_|^\{"tool_/i.test(t)) return true;
  if (/^Thought:|^Action:|^Observation:/i.test(t)) return true;
  if (t.startsWith('{') && (t.includes('"Batch_Size"') || t.includes('"action_input"'))) return true;
  if (/^\{[\s\S]*\}$/.test(t) && t.length < 500) {
    try { JSON.parse(t); return true; } catch { /* not JSON */ }
  }
  if (/^to=multi_tool_use/i.test(t)) return true;
  return false;
}

function extractFinalOutput(fullBuffer: string): string | null {
  const lastBrace = fullBuffer.lastIndexOf('{"output"');
  if (lastBrace === -1) return null;
  const substr = fullBuffer.substring(lastBrace);
  try {
    const parsed = JSON.parse(substr);
    if (typeof parsed.output === 'string' && parsed.output.trim()) {
      return parsed.output.trim();
    }
  } catch {
    const match = substr.match(/\{"output"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/);
    if (match) {
      try { return JSON.parse(`"${match[1]}"`); } catch { /* ignore */ }
    }
  }
  return null;
}

function extractFallbackResponse(fullBuffer: string): string {
  let cleaned = fullBuffer;
  cleaned = cleaned.replace(/Calling\s+\w+\s+with\s+input:\s*\{[^}]*\}/gi, '');
  cleaned = cleaned.replace(/to=multi_tool_use[^\n]*/gi, '');
  cleaned = cleaned.replace(/\{"(Prompt_|tool_|Batch_)[^}]*\}/gi, '');
  cleaned = cleaned.replace(/^(Thought|Action|Observation):[^\n]*/gim, '');
  cleaned = cleaned.replace(/```json[\s\S]*?```/g, '');
  const blocks = cleaned.split(/\n{2,}/).map(b => b.trim()).filter(b => b.length > 20);
  return blocks.length > 0 ? blocks[blocks.length - 1] : cleaned.trim();
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

    // Context
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(10);

    const context = (history || []).reverse();

    // ════════════════════════════════════════════════════════════════
    // START SSE STREAM IMMEDIATELY — before calling n8n
    // This ensures the client always gets data and never hangs
    // ════════════════════════════════════════════════════════════════
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const emittedSteps = new Set<string>();
        let agentBeginCount = 0;
        let lastEventTime = Date.now();

        function emitSSE(data: Record<string, unknown>) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            lastEventTime = Date.now();
          } catch { /* stream closed */ }
        }

        function emitStep(label: string) {
          if (!label || emittedSteps.has(label)) return;
          emittedSteps.add(label);
          console.log(`[nlq-proxy] STEP: ${label}`);
          emitSSE({ type: 'step', step: label });
        }

        // ── Immediately send user_message_id and first step ──
        emitSSE({ user_message_id: userMsg.id });
        emitStep('Analisando sua pergunta...');

        // ── Keepalive: ping every 10s to prevent connection drops ──
        const keepaliveTimer = setInterval(() => {
          if (Date.now() - lastEventTime >= KEEPALIVE_INTERVAL_MS) {
            try {
              emitSSE({ type: 'ping' });
            } catch { /* stream closed */ }
          }
        }, KEEPALIVE_INTERVAL_MS);

        // Helper to finalize
        async function finalize(content: string, status: 'complete' | 'error', errorDetail?: string) {
          clearInterval(keepaliveTimer);

          if (status === 'complete' && content) {
            emitStep('Elaborando resposta final...');
            // Simulate streaming of clean content
            for (let i = 0; i < content.length; i += SIMULATED_CHUNK_SIZE) {
              const tokenChunk = content.substring(i, i + SIMULATED_CHUNK_SIZE);
              emitSSE({ type: 'token', token: tokenChunk });
              if (i + SIMULATED_CHUNK_SIZE < content.length) {
                await new Promise(r => setTimeout(r, SIMULATED_CHUNK_DELAY_MS));
              }
            }
            await supabase
              .from('chat_messages')
              .insert({ session_id, role: 'assistant', content, status: 'complete' });
          } else {
            const errMsg = errorDetail || 'Erro ao processar sua solicitação.';
            await supabase
              .from('chat_messages')
              .insert({ session_id, role: 'assistant', content: '', status: 'error', error_detail: errMsg });
            emitSSE({ error: errMsg });
          }

          emitSSE({ type: 'done' });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }

        try {
          // ── Call n8n with timeout ──
          const n8nAbort = new AbortController();
          const n8nTimeout = setTimeout(() => n8nAbort.abort(), N8N_FETCH_TIMEOUT_MS);

          let n8nResponse: Response;
          try {
            n8nResponse = await fetch(N8N_WEBHOOK_URL, {
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
              signal: n8nAbort.signal,
            });
            clearTimeout(n8nTimeout);
          } catch (fetchErr: any) {
            clearTimeout(n8nTimeout);
            console.error('[nlq-proxy] n8n fetch failed:', fetchErr.message);
            if (fetchErr.name === 'AbortError') {
              await finalize('', 'error', 'A consulta excedeu o tempo limite. Tente com um período menor ou reformule a pergunta.');
            } else {
              await finalize('', 'error', 'Não foi possível conectar ao agente. Tente novamente em alguns instantes.');
            }
            return;
          }

          if (!n8nResponse.ok) {
            const errBody = await n8nResponse.text();
            console.error('[nlq-proxy] n8n error:', n8nResponse.status, errBody);
            await finalize('', 'error', `O agente retornou erro (${n8nResponse.status}). Tente novamente.`);
            return;
          }

          // ── Non-streaming response ──
          if (!n8nResponse.body) {
            const text = await n8nResponse.text();
            let content = text.trim();
            const extracted = extractFinalOutput(content);
            if (extracted) content = extracted;
            await finalize(content || 'Sem resposta do agente.', content ? 'complete' : 'error');
            return;
          }

          // ── Process n8n streaming response ──
          emitStep('Consultando dados...');

          const reader = n8nResponse.body.getReader();
          const decoder = new TextDecoder();
          let fullBuffer = '';
          let lineBuffer = '';
          let chunkIndex = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            chunkIndex++;
            fullBuffer += chunk;
            lastEventTime = Date.now();

            if (chunkIndex <= 5) {
              console.log(`[nlq-proxy] chunk#${chunkIndex} (${chunk.length}b): ${chunk.substring(0, 200)}`);
            }

            // Parse lines for JSON events or text patterns
            lineBuffer += chunk;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              let obj: any;
              try { obj = JSON.parse(trimmed); } catch {
                // Text-based step detection
                const steps = detectStepsInText(trimmed);
                for (const s of steps) emitStep(s);
                continue;
              }

              // JSON events from n8n
              if (obj.type === 'begin') {
                const nodeName = obj.metadata?.nodeName || '';
                if (nodeName.toLowerCase().includes('agente')) agentBeginCount++;
                const label = nodeToStepLabel(nodeName, agentBeginCount);
                if (label) emitStep(label);
              } else if (obj.type === 'item' && typeof obj.content === 'string') {
                const steps = detectStepsInText(obj.content);
                for (const s of steps) emitStep(s);
              } else if (obj.output && typeof obj.output === 'string') {
                emitStep('Processando resultados...');
              }
            }

            // Also detect steps in raw chunk text
            const chunkSteps = detectStepsInText(chunk);
            for (const s of chunkSteps) emitStep(s);
          }

          // Process remaining line buffer
          if (lineBuffer.trim()) {
            const steps = detectStepsInText(lineBuffer);
            for (const s of steps) emitStep(s);
          }

          // ── Extract final content ──
          console.log(`[nlq-proxy] Stream done. ${fullBuffer.length}b, ${chunkIndex} chunks`);
          console.log(`[nlq-proxy] Buffer tail: ${fullBuffer.substring(Math.max(0, fullBuffer.length - 300))}`);

          let finalContent = extractFinalOutput(fullBuffer);
          if (!finalContent) {
            console.warn('[nlq-proxy] No {"output":"..."} found, trying fallback');
            finalContent = extractFallbackResponse(fullBuffer);
          }

          if (!finalContent || finalContent.length < 5) {
            finalContent = 'Desculpe, não consegui processar sua solicitação. Tente novamente.';
          }

          console.log(`[nlq-proxy] Final content: ${finalContent.length} chars`);
          await finalize(finalContent, 'complete');

        } catch (err) {
          console.error('[nlq-proxy] Stream processing error:', err);
          clearInterval(keepaliveTimer);
          const errMsg = (err as Error).message || 'Erro inesperado';
          await supabase
            .from('chat_messages')
            .insert({ session_id, role: 'assistant', content: '', status: 'error', error_detail: errMsg });
          emitSSE({ error: errMsg });
          emitSSE({ type: 'done' });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    // Return SSE stream IMMEDIATELY — n8n call happens inside the stream
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
