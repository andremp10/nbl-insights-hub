import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const N8N_WEBHOOK_URL = 'https://n8n-nbl-golfine.up.railway.app/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';

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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
      // Already processed — find existing pending
      const { data: existingPending } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('session_id', session_id)
        .eq('role', 'assistant')
        .eq('status', 'pending')
        .gte('created_at', windowStart)
        .maybeSingle();

      console.log('[nlq-proxy] Deduplicated message, returning existing pending');
      return new Response(
        JSON.stringify({ success: true, pending_message_id: existingPending?.id || null, deduplicated: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // STEP 1: Insert user message
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({ session_id, role: 'user', content: trimmedMessage, status: 'complete' });

    if (userMsgError) {
      console.error('[nlq-proxy] Error inserting user message:', userMsgError);
      throw userMsgError;
    }

    // STEP 2: Insert pending assistant message
    const { data: pendingMsg, error: pendingError } = await supabase
      .from('chat_messages')
      .insert({ session_id, role: 'assistant', content: '', status: 'pending' })
      .select('id')
      .single();

    if (pendingError || !pendingMsg) {
      console.error('[nlq-proxy] Error inserting pending message:', pendingError);
      throw pendingError || new Error('Failed to create pending message');
    }

    // STEP 3: Fetch last 10 messages for context
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(10);

    const context = (history || []).reverse();

    // STEP 4: Prepare response BEFORE dispatching webhook
    const responseBody = JSON.stringify({
      success: true,
      pending_message_id: pendingMsg.id,
    });

    // STEP 5: Fire-and-forget webhook call
    const webhookPromise = fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'grafica_nbl_lovable',
        message: trimmedMessage,
        session_id,
        pending_message_id: pendingMsg.id,
        context,
        supabase_url: Deno.env.get('SUPABASE_URL'),
        supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      }),
    }).then(async (res) => {
      console.log('[nlq-proxy] n8n responded with status:', res.status);
      if (!res.ok) {
        const errorBody = await res.text();
        console.error('[nlq-proxy] n8n error:', errorBody);
        await supabase
          .from('chat_messages')
          .update({ status: 'error', content: '', error_detail: `Webhook retornou ${res.status}` })
          .eq('id', pendingMsg.id);
      }
    }).catch(async (err) => {
      console.error('[nlq-proxy] Webhook fetch failed:', err.message);
      await supabase
        .from('chat_messages')
        .update({ status: 'error', content: '', error_detail: err.message })
        .eq('id', pendingMsg.id);
    });

    // Register background work
    // @ts-ignore - EdgeRuntime.waitUntil exists in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(webhookPromise);
    }

    // STEP 6: Return immediately
    return new Response(responseBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[nlq-proxy] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
