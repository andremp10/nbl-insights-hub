import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const N8N_WEBHOOK_URL = 'https://webhook-nbl.golfine.com.br/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { message, session_id } = await req.json();
    if (!message?.trim()) throw new Error('Mensagem vazia');
    if (!session_id) throw new Error('session_id obrigatório');

    const trimmedMessage = message.trim();

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

      // Save error message
      await supabase
        .from('chat_messages')
        .insert({ session_id, role: 'assistant', content: '', status: 'error', error_detail: `Webhook retornou ${n8nResponse.status}` });

      return new Response(
        JSON.stringify({ success: false, error: `n8n retornou ${n8nResponse.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // If n8n returns a stream, pipe it through to the frontend
    if (!n8nResponse.body) {
      // Non-streaming response — treat as single chunk
      const text = await n8nResponse.text();
      const content = text.trim();

      await supabase
        .from('chat_messages')
        .insert({ session_id, role: 'assistant', content, status: 'complete' });

      const encoder = new TextEncoder();
      const body = encoder.encode(
        `data: ${JSON.stringify({ token: content })}\n\ndata: ${JSON.stringify({ user_message_id: userMsg.id })}\n\ndata: [DONE]\n\n`
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

    // Streaming response from n8n
    // n8n sends structured JSON lines: {"type":"item","content":"...","metadata":{...}}
    // The stream includes agent thinking, tool calls, and final response.
    // We track begin/end blocks and only stream content from the LAST agente_negocio block.
    // The very last chunk contains {"output":"final text"} from "Respond to Webhook".
    const reader = n8nResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let n8nBuffer = '';
    let streamedContent = '';
    let finalOutput: string | null = null;
    let agentBlockCount = 0;
    let inFinalAgentBlock = false;
    let currentNodeName = '';

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ user_message_id: userMsg.id })}\n\n`));

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

              // Track begin/end blocks to identify the final agent response
              if (obj.type === 'begin') {
                currentNodeName = obj.metadata?.nodeName || '';
                if (currentNodeName === 'agente_negocio') {
                  agentBlockCount++;
                  // The second+ begin of agente_negocio is the actual response
                  if (agentBlockCount >= 2) {
                    inFinalAgentBlock = true;
                  }
                }
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

                // Check if this is the final {"output":"..."} from Respond to Webhook
                try {
                  const parsed = JSON.parse(content);
                  if (parsed.output) {
                    finalOutput = parsed.output;
                    continue;
                  }
                } catch {
                  // Not JSON output wrapper — it's a regular token
                }

                // Only stream tokens from the final agent response block
                if (inFinalAgentBlock) {
                  streamedContent += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: content })}\n\n`));
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
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: obj.content })}\n\n`));
                  }
                }
              }
            } catch { /* ignore */ }
          }

          // Determine the best content to save
          const contentToSave = (finalOutput || streamedContent).trim();
          if (contentToSave) {
            await supabase
              .from('chat_messages')
              .insert({ session_id, role: 'assistant', content: contentToSave, status: 'complete' });

            // If we had no streaming tokens but have finalOutput, send it as a single token
            if (!streamedContent && finalOutput) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: finalOutput })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('[nlq-proxy] Stream error:', err);
          const errMsg = (err as Error).message || 'Erro no stream';

          await supabase
            .from('chat_messages')
            .insert({ session_id, role: 'assistant', content: '', status: 'error', error_detail: errMsg });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
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
