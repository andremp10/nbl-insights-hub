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
const SIMULATED_CHUNK_DELAY_MS = 12;

// ── Step detection on text content ──
interface StepMatch {
  label: string;
  skip?: boolean;
}

function detectStepsInText(text: string): StepMatch[] {
  const matches: StepMatch[] = [];
  if (/to=multi_tool_use/i.test(text)) matches.push({ label: 'Analisando sua pergunta...' });
  if (/Calling agente_consulta/i.test(text)) matches.push({ label: 'Consultando dados de pedidos...' });
  if (/Calling agente_financeiro/i.test(text)) matches.push({ label: 'Consultando dados financeiros...' });
  if (/Calling\s+\w+/i.test(text) && matches.length === 0) matches.push({ label: 'Consultando dados...' });
  if (/functions\.chat_historico/i.test(text)) matches.push({ label: 'Verificando histórico...' });
  return matches;
}

// ── Map n8n node names to friendly labels ──
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

// ── Check if text is internal agent noise ──
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

// ── Extract final output from {"output":"..."} ──
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
    // Try to find it with regex
    const match = substr.match(/\{"output"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/);
    if (match) {
      try { return JSON.parse(`"${match[1]}"`); } catch { /* ignore */ }
    }
  }
  return null;
}

// ── Fallback extraction ──
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

    // Non-streaming fallback
    if (!n8nResponse.body) {
      const text = await n8nResponse.text();
      let content = text.trim();
      const extracted = extractFinalOutput(content);
      if (extracted) content = extracted;

      await supabase
        .from('chat_messages')
        .insert({ session_id, role: 'assistant', content, status: 'complete' });

      const encoder = new TextEncoder();
      const body = encoder.encode(
        `data: ${JSON.stringify({ user_message_id: userMsg.id })}\n\ndata: ${JSON.stringify({ type: 'token', token: content })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\ndata: [DONE]\n\n`
      );
      return new Response(body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // STREAMING — Hybrid parser (JSON lines + raw text detection)
    // ════════════════════════════════════════════════════════════════
    const reader = n8nResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullBuffer = '';
        let lineBuffer = '';
        const emittedSteps = new Set<string>();
        let agentBeginCount = 0;
        let chunkIndex = 0;
        let detectedFormat: 'json' | 'text' | 'unknown' = 'unknown';

        function emitSSE(data: Record<string, unknown>) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        function emitStep(label: string) {
          if (!label || emittedSteps.has(label)) return;
          emittedSteps.add(label);
          console.log(`[nlq-proxy] STEP: ${label}`);
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
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            chunkIndex++;
            fullBuffer += chunk;
            lastEventTime = Date.now();

            // Log first 5 chunks for format diagnosis
            if (chunkIndex <= 5) {
              console.log(`[nlq-proxy] chunk#${chunkIndex} (${chunk.length}b): ${chunk.substring(0, 200)}`);
            }

            // ── Strategy 1: Try JSON-per-line parsing ──
            lineBuffer += chunk;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              let obj: any;
              try { obj = JSON.parse(trimmed); } catch { 
                // Not JSON — use text-based detection on this line
                const textSteps = detectStepsInText(trimmed);
                for (const s of textSteps) {
                  if (!s.skip) emitStep(s.label);
                }
                continue; 
              }

              // Successfully parsed JSON — we know the format
              if (detectedFormat === 'unknown') {
                detectedFormat = 'json';
                console.log('[nlq-proxy] Detected format: JSON-per-line');
              }

              // Handle n8n structured events
              if (obj.type === 'begin') {
                const nodeName = obj.metadata?.nodeName || '';
                if (nodeName.toLowerCase().includes('agente')) agentBeginCount++;
                const label = nodeToStepLabel(nodeName, agentBeginCount);
                if (label) emitStep(label);
                continue;
              }

              if (obj.type === 'end') continue;

              if (obj.type === 'item') {
                const content = obj.content;
                if (typeof content !== 'string' || !content.trim()) continue;

                // Check for final {"output":"..."} wrapper
                try {
                  const parsed = JSON.parse(content);
                  if (parsed.output) {
                    console.log('[nlq-proxy] Found {"output":"..."} in item event');
                    continue; // Will be extracted from fullBuffer later
                  }
                } catch { /* not JSON wrapper */ }

                // Detect steps from content text
                const textSteps = detectStepsInText(content);
                for (const s of textSteps) {
                  if (!s.skip) emitStep(s.label);
                }
                continue;
              }

              // Handle direct {"output":"..."} at top level
              if (obj.output && typeof obj.output === 'string') {
                console.log('[nlq-proxy] Found top-level {"output":"..."}');
                continue;
              }
            }

            // ── Strategy 2: Text-based detection on accumulated buffer ──
            if (detectedFormat !== 'json') {
              if (detectedFormat === 'unknown' && chunkIndex >= 3) {
                detectedFormat = 'text';
                console.log('[nlq-proxy] Detected format: raw text');
              }

              // Detect steps in the raw chunk text
              const textSteps = detectStepsInText(chunk);
              for (const s of textSteps) {
                if (!s.skip) emitStep(s.label);
              }

              // Emoji-based step detection
              if (/[📊📋🧠💡✅]/.test(chunk)) {
                emitStep('Processando resultados...');
              }
            }
          }

          // ── Process remaining lineBuffer ──
          if (lineBuffer.trim()) {
            try {
              const obj = JSON.parse(lineBuffer.trim());
              if (obj.type === 'item' && obj.content) {
                // processed below via fullBuffer
              } else if (obj.output) {
                console.log('[nlq-proxy] Found {"output":"..."} in remaining buffer');
              }
            } catch {
              const textSteps = detectStepsInText(lineBuffer);
              for (const s of textSteps) {
                if (!s.skip) emitStep(s.label);
              }
            }
          }

          // ── Stream finished: extract final output ──
          console.log(`[nlq-proxy] Stream done. Total buffer: ${fullBuffer.length}b, ${chunkIndex} chunks, format: ${detectedFormat}`);
          console.log(`[nlq-proxy] Buffer tail (last 300): ${fullBuffer.substring(fullBuffer.length - 300)}`);

          let finalContent = extractFinalOutput(fullBuffer);
          if (!finalContent) {
            console.warn('[nlq-proxy] No {"output":"..."} found, trying fallback');
            finalContent = extractFallbackResponse(fullBuffer);
          }

          if (!finalContent) {
            finalContent = 'Desculpe, não consegui processar sua solicitação. Tente novamente.';
          }

          console.log(`[nlq-proxy] Final content length: ${finalContent.length}`);

          // Emit final step
          emitStep('Elaborando resposta final...');

          // Simulate streaming of the clean final content
          for (let i = 0; i < finalContent.length; i += SIMULATED_CHUNK_SIZE) {
            const tokenChunk = finalContent.substring(i, i + SIMULATED_CHUNK_SIZE);
            emitSSE({ type: 'token', token: tokenChunk });
            lastEventTime = Date.now();
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
