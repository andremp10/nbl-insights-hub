import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const N8N_WEBHOOK_URL = 'https://webhook-nbl.golfine.com.br/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';

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
    let fullContent = '';
    const reader = n8nResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send user_message_id as first event so frontend can reconcile
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ user_message_id: userMsg.id })}\n\n`));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;

            // Forward chunk as SSE token event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
          }

          // Stream finished — persist full assistant message
          const trimmed = fullContent.trim();
          if (trimmed) {
            await supabase
              .from('chat_messages')
              .insert({ session_id, role: 'assistant', content: trimmed, status: 'complete' });
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
