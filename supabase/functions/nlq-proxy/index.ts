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
// LAYER 1: NODE CLASSIFICATION (strict allowlist)
// ════════════════════════════════════════════════════════════════

const INTERNAL_NODES = [
  'webhook', 'respond to webhook', 'tool', 'supabase', 'execute',
  'http request', 'code', 'set', 'switch', 'if', 'merge', 'split',
  'function', 'item lists', 'no operation', 'mcp_client', 'mcp client',
  'chat_historico', 'chat historico',
];

const SUB_AGENT_NODES = ['agente_consulta', 'agente_financeiro'];

const FINAL_AGENT_NODE = 'agente_negocio';

export function classifyNode(nodeName: string): 'internal' | 'sub_agent' | 'final_agent' | 'ignored' {
  if (!nodeName) return 'internal';
  const lower = nodeName.toLowerCase();
  if (lower.includes(FINAL_AGENT_NODE)) return 'final_agent';
  if (SUB_AGENT_NODES.some(n => lower.includes(n))) return 'sub_agent';
  if (INTERNAL_NODES.some(n => lower.includes(n))) return 'internal';
  // CRITICAL: unknown nodes are IGNORED — never promoted to final_agent
  return 'ignored';
}

// ════════════════════════════════════════════════════════════════
// LAYER 2: STEP LABELS (only from begin/end events)
// ════════════════════════════════════════════════════════════════

function nodeToStepLabel(nodeName: string, agentBeginCount: number): string | null {
  const lower = nodeName.toLowerCase();
  if (lower.includes('agente_consulta')) return 'Consultando dados de pedidos...';
  if (lower.includes('agente_financeiro')) return 'Consultando dados financeiros...';
  if (lower.includes('supabase') || lower.includes('tool') || lower.includes('mcp')) return 'Acessando banco de dados...';
  if (lower.includes('agente_negocio')) {
    return agentBeginCount <= 1 ? 'Analisando sua pergunta...' : 'Elaborando resposta...';
  }
  if (lower.includes('respond to webhook') || lower.includes('webhook')) return null;
  return null;
}

// ════════════════════════════════════════════════════════════════
// LAYER 3: CHUNK NORMALIZER — handles SSE, arrays, partial JSON
// ════════════════════════════════════════════════════════════════

export function normalizeChunkLine(raw: string): string[] {
  let line = raw.trim();
  if (!line) return [];

  // Strip SSE prefix
  if (line.startsWith('data:')) {
    line = line.substring(5).trim();
  }
  if (line === '[DONE]') return [];

  // Try array wrapper: [{"output":"..."}]
  if (line.startsWith('[') && line.endsWith(']')) {
    try {
      const arr = JSON.parse(line);
      if (Array.isArray(arr)) {
        return arr.map((item: any) => JSON.stringify(item));
      }
    } catch { /* not valid array, continue */ }
  }

  return [line];
}

// ════════════════════════════════════════════════════════════════
// LAYER 4: EXTRACT {"output":"..."} FROM BUFFER (robust)
// ════════════════════════════════════════════════════════════════

export function extractFinalOutput(fullBuffer: string): string | null {
  // Strategy 1: Try to find array wrapper [{"output":"..."}]
  const arrayMatch = fullBuffer.match(/\[\s*\{\s*"output"\s*:/);
  if (arrayMatch && arrayMatch.index !== undefined) {
    const substr = fullBuffer.substring(arrayMatch.index);
    try {
      const arr = JSON.parse(substr);
      if (Array.isArray(arr) && arr[0]?.output?.trim()) {
        return arr[0].output.trim();
      }
    } catch { /* try object below */ }
  }

  // Strategy 2: Find last {"output":"..."} occurrence
  const lastBrace = fullBuffer.lastIndexOf('{"output"');
  if (lastBrace === -1) return null;
  const substr = fullBuffer.substring(lastBrace);

  try {
    const parsed = JSON.parse(substr);
    if (typeof parsed.output === 'string' && parsed.output.trim()) {
      return parsed.output.trim();
    }
  } catch {
    // Strategy 3: Regex fallback for malformed JSON
    const match = substr.match(/\{"output"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/);
    if (match) {
      try { return JSON.parse(`"${match[1]}"`); } catch { /* ignore */ }
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
// LAYER 5: SAFETY GATE — block content with internal traces
// ════════════════════════════════════════════════════════════════

const LEAKAGE_PATTERNS = [
  /^Calling \w+ with/im,
  /^Thought:/m,
  /^Action:/m,
  /^Observation:/m,
  /^to=multi_tool_use/m,
  /\{"type"\s*:\s*"(item|begin|end)"/,
  /\{"tool_/,
  /\{"Prompt_/,
  /\{"Batch_Size"/,
  /\{"action_input"/,
  /MCP_Client/i,
  /nodeName.*agente/i,
];

// SQL leakage: full statements only, not fragments in prose
const SQL_LEAKAGE_PATTERNS = [
  /^SELECT\s+[\w.*]+\s+FROM\s+/im,
  /^WITH\s+\w+\s+AS\s*\(/im,
  /^FROM\s+public\.\w+/im,
];

export function hasSafetyLeakage(text: string): boolean {
  if (LEAKAGE_PATTERNS.some(p => p.test(text))) return true;

  // Only flag SQL if it looks like standalone queries (not inside a prose description)
  const lines = text.split('\n');
  const sqlLines = lines.filter(l => SQL_LEAKAGE_PATTERNS.some(p => p.test(l.trim())));
  // If more than 2 standalone SQL lines, it's a leak
  if (sqlLines.length > 2) return true;

  return false;
}

// ════════════════════════════════════════════════════════════════
// LAYER 6: FALLBACK SANITIZER — clean accumulated content
// ════════════════════════════════════════════════════════════════

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

const RESPONSE_START_PATTERNS = [
  /^_Períodos?:/m,
  /^\*\*Resumo\*\*/m,
  /^#{1,3}\s+/m,
  /^📊/m,
  /^📋/m,
  /^\|[^|]+\|/m,
  /^>\s+/m,
  /^Em\s+\w+\s+de\s+\d{4}/m,
  /^No\s+período/m,
  /^Resumo/m,
];

export function sanitizeFallbackContent(raw: string): string | null {
  if (!raw || raw.trim().length < 20) return null;

  let text = raw;

  // Find the start of a real response
  let bestStart = -1;
  for (const pattern of RESPONSE_START_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      if (bestStart === -1 || match.index < bestStart) {
        bestStart = match.index;
      }
    }
  }
  if (bestStart > 0) text = text.substring(bestStart);

  // Check for noise
  const hasNoise = NOISE_MARKERS.some(p => p.test(text));
  if (hasNoise) {
    // Find LAST occurrence of a response start pattern
    let lastGoodStart = -1;
    for (const pattern of RESPONSE_START_PATTERNS) {
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('m') ? 'gm' : 'g');
      let m;
      while ((m = globalPattern.exec(raw)) !== null) {
        if (m.index > lastGoodStart) lastGoodStart = m.index;
      }
    }
    if (lastGoodStart > 0) {
      text = raw.substring(lastGoodStart);
      if (NOISE_MARKERS.some(p => p.test(text))) return null;
    } else {
      return null;
    }
  }

  // Reject if mostly JSON
  const allLines = text.split('\n');
  const jsonLikeLines = allLines.filter(l => l.trim().startsWith('{') || l.trim().startsWith('"type"'));
  if (jsonLikeLines.length > allLines.length * 0.3) return null;

  const cleaned = text.trim();
  if (cleaned.length <= 20) return null;

  // FINAL safety gate on cleaned content
  if (hasSafetyLeakage(cleaned)) return null;

  return cleaned;
}

// ════════════════════════════════════════════════════════════════
// LAYER 7: DEDUPLICATION — pick best block if duplicated
// ════════════════════════════════════════════════════════════════

export function deduplicateResponse(text: string): string {
  // Collect ALL response-start positions of any kind
  const startMarkers = [
    /\*\*Resumo\*\*/g,
    /_Períodos?:/g,
    /📊\s*\*?\*?Resumo/g,
    /📊/g,
  ];

  const allPositions: number[] = [];
  for (const re of startMarkers) {
    let m;
    while ((m = re.exec(text)) !== null) allPositions.push(m.index);
  }
  allPositions.sort((a, b) => a - b);

  if (allPositions.length < 2) return text;

  // Group near positions (within 30 chars) — they belong to the same block.
  // E.g. "_Períodos:..." then "**Resumo**" right after = same block.
  // But "📊 First summary" + "📊 Final summary" 38 chars apart = different blocks.
  const blocks: number[] = [allPositions[0]];
  for (let i = 1; i < allPositions.length; i++) {
    if (allPositions[i] - blocks[blocks.length - 1] > 30) {
      blocks.push(allPositions[i]);
    }
  }

  if (blocks.length < 2) return text;

  // Multiple distinct blocks → keep last one
  const lastBlockStart = blocks[blocks.length - 1];

  // If lastBlockStart already IS a _Períodos: marker, use it directly.
  // Otherwise walk back ~80 chars to find a preceding _Períodos: from the same block.
  let realStart = lastBlockStart;
  const sliceAhead = text.substring(lastBlockStart, lastBlockStart + 12);
  if (!/^_Períodos?:/.test(sliceAhead)) {
    const windowStart = Math.max(0, lastBlockStart - 80);
    const window = text.substring(windowStart, lastBlockStart);
    let periodInWindow = window.lastIndexOf('_Períodos:');
    if (periodInWindow === -1) periodInWindow = window.lastIndexOf('_Período:');
    if (periodInWindow !== -1) realStart = windowStart + periodInWindow;
  }

  return text.substring(realStart).trim();
}

// ════════════════════════════════════════════════════════════════
// LAYER 7b: EXTRACT LAST CLEAN BLOCK (handles ReAct + dup mixed content)
// ════════════════════════════════════════════════════════════════

/**
 * For finalAgentContent that may contain:
 *  - ReAct traces ("Calling X with...", "Thought:", JSON dumps)
 *  - Sub-agent observation echoed back
 *  - The actual final answer
 *
 * Strategy: scan for noise positions and response-start positions.
 * Pick the LAST response-start that occurs AFTER the LAST noise marker.
 * If the resulting slice still has noise, return null.
 */
export function extractLastCleanBlock(raw: string): string | null {
  if (!raw || raw.trim().length < 20) return null;

  // Find LAST occurrence of any noise marker
  let lastNoiseEnd = -1;
  for (const pattern of NOISE_MARKERS) {
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let m;
    while ((m = re.exec(raw)) !== null) {
      const end = m.index + m[0].length;
      if (end > lastNoiseEnd) lastNoiseEnd = end;
    }
  }

  // Find LAST occurrence of any response-start marker that comes AFTER lastNoiseEnd
  // Find EARLIEST occurrence of any response-start marker that comes AFTER lastNoiseEnd.
  // (Earliest, because we want the natural start of the answer block — e.g. _Períodos:
  // before **Resumo** in the same response.)
  let bestStart = -1;
  for (const pattern of RESPONSE_START_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let m;
    while ((m = re.exec(raw)) !== null) {
      if (m.index > lastNoiseEnd) {
        if (bestStart === -1 || m.index < bestStart) bestStart = m.index;
      }
    }
  }

  if (bestStart === -1) {
    // No clean response after noise. Maybe no noise at all? Try sanitize fallback.
    if (lastNoiseEnd === -1) return sanitizeFallbackContent(raw);
    return null;
  }

  let candidate = raw.substring(bestStart).trim();
  if (candidate.length < 20) return null;

  // Apply dedup to remove echoed sub-agent block if present
  candidate = deduplicateResponse(candidate);

  // Final safety check
  if (hasSafetyLeakage(candidate)) return null;

  // Reject if it became JSON-heavy
  const allLines = candidate.split('\n');
  const jsonLikeLines = allLines.filter(l => l.trim().startsWith('{') || l.trim().startsWith('"type"'));
  if (jsonLikeLines.length > allLines.length * 0.3) return null;

  return candidate;
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

    // Pre-create assistant message in 'processing'. This guarantees the user always
    // has a corresponding row to see (success or error) on the next session load,
    // even if the SSE connection drops mid-stream.
    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        role: 'assistant',
        content: '',
        status: 'processing',
        reply_to_message_id: userMsg.id,
        processing_started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (assistantMsgError) throw assistantMsgError;
    const assistantMsgId = assistantMsg.id;

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

    // Shared flag so cancel() can mark disconnection without aborting the work
    let clientDisconnected = false;

    const stream = new ReadableStream({
      async start(controller) {
        const emittedSteps = new Set<string>();
        let agentBeginCount = 0;
        let lastEventTime = Date.now();
        let controllerClosed = false;
        let assistantPersisted = false; // tracks if a 'complete' row was already inserted

        // Content accumulators (NEVER sent to frontend during processing)
        let canonicalOutput = '';  // from {"output":"..."} found inline
        let finalAgentContent = '';
        let subAgentContent = '';

        function isClosedError(e: unknown): boolean {
          const msg = (e as Error)?.message || '';
          return msg.includes('cannot close or enqueue') || msg.includes('controller is closed');
        }

        function emitSSE(data: Record<string, unknown>) {
          if (controllerClosed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            lastEventTime = Date.now();
          } catch (e) {
            if (isClosedError(e)) {
              controllerClosed = true;
            }
          }
        }
        function emitStep(label: string) {
          if (controllerClosed) return;
          if (emittedSteps.has(label)) return;
          emittedSteps.add(label);
          emitSSE({ type: 'step', label });
        }

        // Keepalive: send a comment line every 15s to prevent idle disconnect
        const keepaliveTimer = setInterval(() => {
          if (controllerClosed) return;
          if (Date.now() - lastEventTime < 10_000) return;
          try {
            controller.enqueue(encoder.encode(`: keepalive

`));
            lastEventTime = Date.now();
          } catch (e) {
            if (isClosedError(e)) controllerClosed = true;
          }
        }, 15_000);
        // Finalize: deliver content to frontend and DB
        async function finalize(content: string, status: 'complete' | 'error', errorDetail?: string) {
          clearInterval(keepaliveTimer);

          // Always UPDATE the pre-created assistant row (never INSERT a new one).
          // This works even if the client has already disconnected.
          if (assistantPersisted) {
            // Already finalized once — guard against double-calls
          } else if (status === 'complete' && content) {
            const { error: updErr } = await supabase
              .from('chat_messages')
              .update({
                content,
                status: 'complete',
                completed_at: new Date().toISOString(),
                error_detail: null,
              })
              .eq('id', assistantMsgId)
              .eq('status', 'processing'); // only transition from processing
            if (!updErr) assistantPersisted = true;
            else console.error('[nlq-proxy] finalize update (complete) failed:', updErr);

            // Try to flush to client (cosmetic — single shot, no batching delay)
            emitStep('Elaborando resposta final...');
            emitSSE({ type: 'token', token: content });
          } else {
            const errMsg = errorDetail || 'Erro ao processar sua solicitação.';
            const { error: updErr } = await supabase
              .from('chat_messages')
              .update({
                content: '',
                status: 'error',
                error_detail: errMsg,
                completed_at: new Date().toISOString(),
              })
              .eq('id', assistantMsgId)
              .eq('status', 'processing');
            if (!updErr) assistantPersisted = true;
            else console.error('[nlq-proxy] finalize update (error) failed:', updErr);
            emitSSE({ error: errMsg });
          }

          emitSSE({ type: 'done' });
          if (!controllerClosed) {
            try {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch (e) { if (isClosedError(e)) controllerClosed = true; }
          }
          if (!controllerClosed) {
            try { controller.close(); } catch { /* already closed */ }
            controllerClosed = true;
          }
        }

        try {
          // Call n8n
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

          // Non-streaming response
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
          // NO tokens sent to frontend during processing.
          // Only "step" events. Content accumulated silently.
          // Final answer delivered ONLY in finalize().
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

            for (const rawLine of lines) {
              // LAYER 3: Normalize each line (strip SSE, handle arrays)
              const normalized = normalizeChunkLine(rawLine);

              for (const jsonStr of normalized) {
                let obj: any;
                try { obj = JSON.parse(jsonStr); } catch { continue; }

                // Check for inline {"output":"..."} — canonical capture
                if (obj.output && typeof obj.output === 'string' && obj.output.trim()) {
                  canonicalOutput = obj.output.trim();
                  emitStep('Processando resultados...');
                  continue;
                }

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
                  // 'internal' and 'ignored' nodes: content discarded

                } else if (obj.type === 'end') {
                  // Nothing to do
                }
              }
            }
          }

          // Process remaining line buffer
          if (lineBuffer.trim()) {
            const normalized = normalizeChunkLine(lineBuffer);
            for (const jsonStr of normalized) {
              try {
                const obj = JSON.parse(jsonStr);
                if (obj.output && typeof obj.output === 'string' && obj.output.trim()) {
                  canonicalOutput = obj.output.trim();
                } else if (obj.type === 'item' && obj.content) {
                  const nodeClass = classifyNode(obj.metadata?.nodeName || '');
                  if (nodeClass === 'final_agent') {
                    finalAgentContent += String(obj.content);
                  } else if (nodeClass === 'sub_agent') {
                    subAgentContent += String(obj.content);
                  }
                }
              } catch { /* ignore */ }
            }
          }

          // ── SELECT FINAL CONTENT (priority chain) ──
          console.log(`[nlq-proxy] Stream done. ${fullBuffer.length}b, ${chunkIndex} chunks`);
          console.log(`[nlq-proxy] canonicalOutput: ${canonicalOutput.length}, finalAgent: ${finalAgentContent.length}, subAgent: ${subAgentContent.length}`);

          let finalContent = '';

          // P1: Canonical {"output":"..."} found inline during stream
          if (canonicalOutput) {
            finalContent = canonicalOutput;
            console.log(`[nlq-proxy] P1: inline canonical output: ${finalContent.length} chars`);
          }

          // P2: Extract {"output":"..."} from full buffer (covers cases where it wasn't parsed inline)
          if (!finalContent) {
            const extracted = extractFinalOutput(fullBuffer);
            if (extracted) {
              finalContent = extracted;
              console.log(`[nlq-proxy] P2: extracted from buffer: ${finalContent.length} chars`);
            }
          }

          // P3: Final agent — extract LAST clean block (handles ReAct + dup)
          if (!finalContent && finalAgentContent.length > 20) {
            const cleaned = extractLastCleanBlock(finalAgentContent);
            if (cleaned) {
              finalContent = cleaned;
              console.log(`[nlq-proxy] P3: extracted last clean block from finalAgent: ${finalContent.length} chars`);
            }
          }

          // P4: Sub-agent content as last resort
          if (!finalContent && subAgentContent.length > 20) {
            const cleaned = extractLastCleanBlock(subAgentContent);
            if (cleaned) {
              finalContent = cleaned;
              console.log(`[nlq-proxy] P4: extracted last clean block from subAgent: ${finalContent.length} chars`);
            }
          }

          // P5: Last-resort scan of entire fullBuffer for clean block
          if (!finalContent && fullBuffer.length > 100) {
            const cleaned = extractLastCleanBlock(fullBuffer);
            if (cleaned) {
              finalContent = cleaned;
              console.log(`[nlq-proxy] P5: extracted last clean block from fullBuffer: ${finalContent.length} chars`);
            }
          }

          // DEDUPLICATION (defensive — extractLastCleanBlock already calls it)
          if (finalContent) {
            finalContent = deduplicateResponse(finalContent);
          }

          // SAFETY GATE: block any content that still has leakage
          if (finalContent && hasSafetyLeakage(finalContent)) {
            console.warn(`[nlq-proxy] SAFETY GATE BLOCKED — leakage detected in final content (${finalContent.length} chars)`);
            console.warn(`[nlq-proxy] First 300 chars: ${finalContent.substring(0, 300)}`);
            finalContent = '';
          }

          // DELIVER
          if (finalContent) {
            console.log(`[nlq-proxy] Final content approved: ${finalContent.length} chars`);
            await finalize(finalContent, 'complete');
          } else {
            console.warn('[nlq-proxy] No safe content — returning controlled error');
            await finalize('', 'error', 'Não foi possível processar a resposta do agente. Tente reformular a pergunta.');
          }

        } catch (err) {
          console.error('[nlq-proxy] Stream processing error:', err);
          clearInterval(keepaliveTimer);
          // If we already finalized (assistantPersisted), nothing to do.
          // Otherwise ALWAYS finalize as error so the user sees a row instead of silence —
          // even on client disconnect (isClosedError), we still UPDATE the pre-created row.
          if (!assistantPersisted) {
            const errMsg = isClosedError(err)
              ? 'A conexão foi interrompida antes da resposta ser concluída. Tente novamente.'
              : ((err as Error).message || 'Erro inesperado');
            try {
              await finalize('', 'error', errMsg);
            } catch (finalizeErr) {
              console.error('[nlq-proxy] finalize() in catch failed:', finalizeErr);
              // Last-resort direct UPDATE so the row never stays in 'processing'
              await supabase
                .from('chat_messages')
                .update({
                  content: '',
                  status: 'error',
                  error_detail: errMsg,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', assistantMsgId)
                .eq('status', 'processing');
            }
          }
          if (!controllerClosed) {
            try { controller.enqueue(encoder.encode('data: [DONE]\n\n')); } catch { /* closed */ }
            try { controller.close(); } catch { /* closed */ }
            controllerClosed = true;
          }
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
