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
const FINAL_TOKEN_BATCH_SIZE = 120;
const N8N_FETCH_TIMEOUT_MS = 360_000;

// ════════════════════════════════════════════════════════════════
// NODE CLASSIFICATION
// ════════════════════════════════════════════════════════════════

// Nodes that generate steps but whose content is NEVER shown
const INTERNAL_NODES = [
  'webhook', 'respond to webhook', 'tool', 'supabase', 'execute',
  'http request', 'code', 'set', 'switch', 'if', 'merge', 'split',
  'function', 'item lists', 'no operation', 'mcp_client', 'mcp client',
  'chat_historico', 'chat historico',
];

// Sub-agent nodes: their content is accumulated as CANDIDATE but never streamed live
const SUB_AGENT_NODES = ['agente_consulta', 'agente_financeiro'];

// The final answer node — only this node's content is a real candidate
const FINAL_AGENT_NODE = 'agente_negocio';

function classifyNode(nodeName: string): 'internal' | 'sub_agent' | 'final_agent' | 'step_only' {
  if (!nodeName) return 'internal';
  const lower = nodeName.toLowerCase();
  if (lower.includes(FINAL_AGENT_NODE)) return 'final_agent';
  if (SUB_AGENT_NODES.some(n => lower.includes(n))) return 'sub_agent';
  if (INTERNAL_NODES.some(n => lower.includes(n))) return 'internal';
  if (lower.includes('agente')) return 'final_agent'; // unknown agent → treat as final
  return 'step_only';
}

// ════════════════════════════════════════════════════════════════
// STEP LABELS (only from begin/end events, never from content)
// ════════════════════════════════════════════════════════════════

function nodeToStepLabel(nodeName: string, agentBeginCount: number): string | null {
  const lower = nodeName.toLowerCase();
  if (lower.includes('agente_consulta')) return 'Consultando dados de pedidos...';
  if (lower.includes('agente_financeiro')) return 'Consultando dados financeiros...';
  if (lower.includes('supabase') || lower.includes('tool') || lower.includes('mcp')) return 'Acessando banco de dados...';
  if (lower.includes('agente_negocio') || lower.includes('agente')) {
    return agentBeginCount <= 1 ? 'Analisando sua pergunta...' : 'Elaborando resposta...';
  }
  if (lower.includes('respond to webhook') || lower.includes('webhook')) return null;
  return null; // Don't emit generic "Processando..." for unknown nodes
}

// ════════════════════════════════════════════════════════════════
// EXTRACT {"output":"..."} FROM BUFFER (primary extraction)
// ════════════════════════════════════════════════════════════════

export function extractFinalOutput(fullBuffer: string): string | null {
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

// ════════════════════════════════════════════════════════════════
// FALLBACK SANITIZER — clean accumulated content for safe display
// ════════════════════════════════════════════════════════════════

// Patterns that indicate internal noise in accumulated content
const NOISE_MARKERS = [
  /^Calling \w+ with input:/im,
  /^Calling \w+ with \{/im,
  /^```json\s*\{/m,
  /^\{"Prompt_/m,
  /^\{"tool_/m,
  /^Thought:/m,
  /^Action:/m,
  /^Observation:/m,
  /^to=multi_tool_use/m,
  /^\{"Batch_Size"/m,
  /^\{"action_input"/m,
  /^SELECT\s+/im,
  /^FROM\s+public\./im,
  /^WITH\s+\w+\s+AS\s*\(/im,
];

// Markers that indicate the START of a real response
const RESPONSE_START_PATTERNS = [
  /^_Períodos?:/m,
  /^\*\*Resumo\*\*/m,
  /^#{1,3}\s+/m,
  /^📊/m,
  /^📋/m,
  /^\|[^|]+\|/m, // markdown table
  /^>\s+/m, // blockquote
  /^Em\s+\w+\s+de\s+\d{4}/m, // "Em março de 2026"
  /^No\s+período/m,
  /^Resumo/m,
];

export function sanitizeFallbackContent(raw: string): string | null {
  if (!raw || raw.trim().length < 20) return null;

  let text = raw;

  // Try to find the start of a real response by looking for response markers
  let bestStart = -1;
  for (const pattern of RESPONSE_START_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      if (bestStart === -1 || match.index < bestStart) {
        bestStart = match.index;
      }
    }
  }

  if (bestStart > 0) {
    text = text.substring(bestStart);
  }

  // Check if the remaining text still contains noise markers
  const hasNoise = NOISE_MARKERS.some(p => p.test(text));
  if (hasNoise) {
    // Try harder: find the LAST occurrence of a response start pattern
    let lastGoodStart = -1;
    for (const pattern of RESPONSE_START_PATTERNS) {
      let m;
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('m') ? 'gm' : 'g');
      while ((m = globalPattern.exec(raw)) !== null) {
        if (m.index > lastGoodStart) lastGoodStart = m.index;
      }
    }
    if (lastGoodStart > 0) {
      text = raw.substring(lastGoodStart);
      // Re-check
      const stillNoisy = NOISE_MARKERS.some(p => p.test(text));
      if (stillNoisy) return null; // Too noisy, reject
    } else {
      return null; // No clean response found
    }
  }

  // Final safety: if the text is mostly JSON objects, reject it
  const jsonLikeLines = text.split('\n').filter(l => l.trim().startsWith('{') || l.trim().startsWith('"type"'));
  if (jsonLikeLines.length > text.split('\n').length * 0.3) {
    return null;
  }

  const cleaned = text.trim();
  return cleaned.length > 20 ? cleaned : null;
}

// ════════════════════════════════════════════════════════════════
// MAIN SERVER
// ════════════════════════════════════════════════════════════════

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
    // SSE STREAM — STEPS ONLY DURING PROCESSING, CONTENT AT END
    // ════════════════════════════════════════════════════════════════
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const emittedSteps = new Set<string>();
        let agentBeginCount = 0;
        let lastEventTime = Date.now();

        // Content accumulators (NEVER sent to frontend during processing)
        let finalAgentContent = '';
        let subAgentContent = '';

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

        // ── Send user_message_id and first step ──
        emitSSE({ user_message_id: userMsg.id });
        emitStep('Analisando sua pergunta...');

        // ── Keepalive: ping every 10s to prevent connection drops ──
        const keepaliveTimer = setInterval(() => {
          if (Date.now() - lastEventTime >= KEEPALIVE_INTERVAL_MS) {
            try { emitSSE({ type: 'ping' }); } catch { /* closed */ }
          }
        }, KEEPALIVE_INTERVAL_MS);

        // ── Finalize: deliver content to frontend and DB ──
        async function finalize(content: string, status: 'complete' | 'error', errorDetail?: string) {
          clearInterval(keepaliveTimer);

          if (status === 'complete' && content) {
            emitStep('Elaborando resposta final...');

            // Stream the final content to frontend in batches
            for (let i = 0; i < content.length; i += FINAL_TOKEN_BATCH_SIZE) {
              const chunk = content.substring(i, i + FINAL_TOKEN_BATCH_SIZE);
              emitSSE({ type: 'token', token: chunk });
              if (i + FINAL_TOKEN_BATCH_SIZE < content.length) {
                await new Promise(r => setTimeout(r, 10));
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
          // ── Call n8n ──
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

          // ══════════════════════════════════════════════════════════
          // PROCESS N8N STREAM
          // Key change: NO tokens are sent to the frontend during processing.
          // Only "step" events are emitted. Content is accumulated silently.
          // The final answer is delivered ONLY in finalize().
          // ══════════════════════════════════════════════════════════
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

            if (chunkIndex <= 3) {
              console.log(`[nlq-proxy] chunk#${chunkIndex} (${chunk.length}b): ${chunk.substring(0, 200)}`);
            }

            // Parse lines
            lineBuffer += chunk;
            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              let obj: any;
              try { obj = JSON.parse(trimmed); } catch { continue; }

              const nodeName = obj.metadata?.nodeName || '';
              const nodeClass = classifyNode(nodeName);

              if (obj.type === 'begin') {
                if (nodeName.toLowerCase().includes('agente')) agentBeginCount++;
                const label = nodeToStepLabel(nodeName, agentBeginCount);
                if (label) emitStep(label);

              } else if (obj.type === 'item' && obj.content !== undefined) {
                const content = String(obj.content);
                if (!content) continue;

                // Accumulate silently based on node class
                if (nodeClass === 'final_agent') {
                  finalAgentContent += content;
                } else if (nodeClass === 'sub_agent') {
                  subAgentContent += content;
                }
                // internal and step_only nodes: content is discarded

              } else if (obj.type === 'end') {
                // Nothing to flush — no live tokens
              } else if (obj.output && typeof obj.output === 'string') {
                emitStep('Processando resultados...');
              }
            }
          }

          // Process remaining line buffer
          if (lineBuffer.trim()) {
            try {
              const obj = JSON.parse(lineBuffer.trim());
              if (obj.type === 'item' && obj.content) {
                const nodeClass = classifyNode(obj.metadata?.nodeName || '');
                if (nodeClass === 'final_agent') {
                  finalAgentContent += String(obj.content);
                } else if (nodeClass === 'sub_agent') {
                  subAgentContent += String(obj.content);
                }
              }
            } catch { /* ignore */ }
          }

          // ── SELECT FINAL CONTENT ──
          console.log(`[nlq-proxy] Stream done. ${fullBuffer.length}b, ${chunkIndex} chunks`);
          console.log(`[nlq-proxy] finalAgentContent: ${finalAgentContent.length} chars, subAgentContent: ${subAgentContent.length} chars`);

          // Priority 1: Extract {"output":"..."} from full buffer
          let finalContent = extractFinalOutput(fullBuffer);

          if (finalContent) {
            console.log(`[nlq-proxy] Using {"output":"..."}: ${finalContent.length} chars`);
          } else {
            // Priority 2: Use final agent node content (sanitized)
            if (finalAgentContent.length > 20) {
              const sanitized = sanitizeFallbackContent(finalAgentContent);
              if (sanitized) {
                console.log(`[nlq-proxy] Using sanitized finalAgentContent: ${sanitized.length} chars`);
                finalContent = sanitized;
              }
            }

            // Priority 3: Use sub-agent content as last resort (sanitized)
            if (!finalContent && subAgentContent.length > 20) {
              const sanitized = sanitizeFallbackContent(subAgentContent);
              if (sanitized) {
                console.log(`[nlq-proxy] Using sanitized subAgentContent: ${sanitized.length} chars`);
                finalContent = sanitized;
              }
            }

            // Priority 4: controlled error
            if (!finalContent) {
              console.warn('[nlq-proxy] No safe content found — returning controlled error');
              finalContent = '';
            }
          }

          if (finalContent) {
            console.log(`[nlq-proxy] Final content: ${finalContent.length} chars`);
            await finalize(finalContent, 'complete');
          } else {
            await finalize('', 'error', 'Não foi possível processar a resposta do agente. Tente reformular a pergunta.');
          }

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
