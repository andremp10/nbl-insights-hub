import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const N8N_WEBHOOK_URL = 'https://webhook-nbl.golfine.com.br/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Maps n8n node names to user-friendly step labels
function nodeToStepLabel(nodeName: string, agentBeginCount: number): string {
  const lower = nodeName.toLowerCase();
  if (lower.includes('supabase') || lower.includes('tool')) return 'Consultando banco de dados...';
  if (lower.includes('agente_negocio') || lower.includes('agente')) {
    return agentBeginCount <= 1 ? 'Processando sua pergunta...' : 'Elaborando resposta...';
  }
  return 'Processando...';
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

    // AUTH: Validate JWT and session ownership
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
      console.error('[nlq-proxy] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Verify session belongs to the authenticated user
    const { data: sessionOwner, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !sessionOwner || sessionOwner.user_id !== userId) {
      console.error('[nlq-proxy] Session ownership check failed for user', userId, 'session', session_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão não pertence ao usuário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY: Check for duplicate message in last 10 seconds
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
      console.log('[nlq-proxy] Deduplicated message');
      return new Response(
        JSON.stringify({ success: true, deduplicated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // STEP 1: Insert user message
    const { data: userMsg, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({ session_id, role: 'user', content: trimmedMessage, status: 'complete' })
      .select('id')
      .single();

    if (userMsgError) {
      console.error('[nlq-proxy] Error inserting user message:', userMsgError);
      throw userMsgError;
    }

    // STEP 2: Fetch last 10 messages for context
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(10);

    const context = (history || []).reverse();

    // STEP 3: Call n8n webhook and stream the response
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'grafica_nbl_lovable',
        message: trimmedMessage,
        session_id,
        user_message_id: userMsg.id,
        context,
        supabase_url: Deno.env.get('SUPABASE_URL'),
        supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
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
      const content = text.trim();

      await supabase
        .from('chat_messages')
        .insert({ session_id, role: 'assistant', content, status: 'complete' });

      const encoder = new TextEncoder();
      const body = encoder.encode(
        `data: ${JSON.stringify({ type: 'token', token: content })}\n\ndata: ${JSON.stringify({ user_message_id: userMsg.id })}\n\ndata: [DONE]\n\n`
      );

      return new Response(body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Streaming response from n8n — emit typed SSE events (step / token)
    const reader = n8nResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let n8nBuffer = '';
    let streamedContent = '';
    let finalOutput: string | null = null;
    let agentBlockCount = 0;
    let inFinalAgentBlock = false;
    let currentNodeName = '';
    const emittedSteps = new Set<string>();

    function emitSSE(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    }

    function emitStep(controller: ReadableStreamDefaultController, label: string) {
      if (emittedSteps.has(label)) return;
      emittedSteps.add(label);
      emitSSE(controller, { type: 'step', step: label });
    }

    const stream = new ReadableStream({
      async start(controller) {
        emitSSE(controller, { user_message_id: userMsg.id });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            n8nBuffer += decoder.decode(value, { stream: true });
            const lines = n8nBuffer.split('\n');
            n8nBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;

              let obj: any;
              try { obj = JSON.parse(trimmedLine); } catch { continue; }

              if (obj.type === 'begin') {
                currentNodeName = obj.metadata?.nodeName || '';
                if (currentNodeName === 'agente_negocio') {
                  agentBlockCount++;
                  if (agentBlockCount >= 2) {
                    inFinalAgentBlock = true;
                  }
                }
                // Emit a step indicator for every begin event
                const stepLabel = nodeToStepLabel(currentNodeName, agentBlockCount);
                emitStep(controller, stepLabel);
                continue;
              }

              if (obj.type === 'end') {
                if (currentNodeName === 'agente_negocio' && inFinalAgentBlock) {
                  inFinalAgentBlock = false;
                }
                continue;
              }

              if (obj.type === 'item') {
                const content = obj.content;
                if (typeof content !== 'string' || content === '') continue;

                // Check for final {"output":"..."} from Respond to Webhook
                try {
                  const parsed = JSON.parse(content);
                  if (parsed.output) {
                    finalOutput = parsed.output;
                    continue;
                  }
                } catch {
                  // Not a JSON wrapper
                }

                // Only stream tokens from the final agent response block
                if (inFinalAgentBlock) {
                  streamedContent += content;
                  emitSSE(controller, { type: 'token', token: content });
                }
              }
            }
          }

          // Process remaining buffer
          if (n8nBuffer.trim()) {
            try {
              const obj = JSON.parse(n8nBuffer.trim());
              if (obj.type === 'item' && obj.content) {
                try {
                  const parsed = JSON.parse(obj.content);
                  if (parsed.output) finalOutput = parsed.output;
                } catch {
                  if (inFinalAgentBlock) {
                    streamedContent += obj.content;
                    emitSSE(controller, { type: 'token', token: obj.content });
                  }
                }
              }
            } catch { /* ignore */ }
          }

          // Save final content
          const contentToSave = (finalOutput || streamedContent).trim();
          if (contentToSave) {
            await supabase
              .from('chat_messages')
              .insert({ session_id, role: 'assistant', content: contentToSave, status: 'complete' });

            if (!streamedContent && finalOutput) {
              emitSSE(controller, { type: 'token', token: finalOutput });
            }
          }

          emitSSE(controller, { type: 'done' });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[nlq-proxy] Stream error:', err);
          const errMsg = (err as Error).message || 'Erro no stream';

          await supabase
            .from('chat_messages')
            .insert({ session_id, role: 'assistant', content: '', status: 'error', error_detail: errMsg });

          emitSSE(controller, { error: errMsg });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[nlq-proxy] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
