 const N8N_WEBHOOK_URL = "https://chez-n8n-webhook.jsf0kc.easypanel.host/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
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
 
 function normalizeN8NResponse(rawData: string): ChatReply {
   const reply: ChatReply = { text: '', highlights: [], suggested_actions: [] };
   
   try {
     const parsed = JSON.parse(rawData);
     
     // Case 1: Already structured response { reply: { text, highlights, ... } }
     if (parsed.reply?.text) {
       return {
         text: parsed.reply.text,
         highlights: parsed.reply.highlights || [],
         suggested_actions: parsed.reply.suggested_actions || [],
         chart_payloads: parsed.reply.chart_payloads,
       };
     }
     
     // Case 2: Direct response with text field { text: "..." }
     if (parsed.text) {
       return {
         text: parsed.text,
         highlights: parsed.highlights || [],
         suggested_actions: parsed.suggested_actions || [],
         chart_payloads: parsed.chart_payloads,
       };
     }
     
     // Case 3: n8n format { output: "..." }
     if (parsed.output) {
       reply.text = typeof parsed.output === 'string' 
         ? parsed.output 
         : JSON.stringify(parsed.output);
       return reply;
     }
     
     // Case 4: String value
     if (typeof parsed === 'string') {
       reply.text = parsed;
       return reply;
     }
     
     // Case 5: Unknown JSON structure - stringify
     reply.text = JSON.stringify(parsed, null, 2);
     return reply;
     
   } catch {
     // Plain text response
     reply.text = rawData || 'Resposta vazia do servidor.';
     return reply;
   }
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   if (req.method !== 'POST') {
     return new Response(JSON.stringify({ 
       ok: false, 
       error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is allowed' } 
     }), {
       status: 405,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 
   try {
     const body: ChatRequest = await req.json();
     
     console.log('[nlq-proxy] Received request:', { 
       session_id: body.session_id, 
       message: body.message?.substring(0, 100),
       context: body.context,
     });
 
     // Validate required fields
     if (!body.message?.trim()) {
       return new Response(JSON.stringify({
         ok: false,
         error: { code: 'INVALID_REQUEST', message: 'Mensagem é obrigatória.' },
       } as ChatResponse), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Forward to n8n with timeout
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
 
     try {
       const n8nPayload = {
         app: 'grafica_nbl_lovable',
         session_id: body.session_id || 'anonymous',
         timezone: body.timezone || 'America/Fortaleza',
         message: body.message.trim(),
         context: body.context || {},
       };
 
       console.log('[nlq-proxy] Forwarding to n8n:', N8N_WEBHOOK_URL);
 
       const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(n8nPayload),
         signal: controller.signal,
       });
 
       clearTimeout(timeoutId);
 
       console.log('[nlq-proxy] n8n response status:', n8nResponse.status);
 
       if (!n8nResponse.ok) {
         const errorText = await n8nResponse.text();
         console.error('[nlq-proxy] n8n error:', errorText);
         
         return new Response(JSON.stringify({
           ok: false,
           error: { 
             code: 'N8N_ERROR', 
             message: 'O assistente não conseguiu processar sua pergunta. Tente novamente.' 
           },
         } as ChatResponse), {
           status: 502,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
       }
 
       const rawData = await n8nResponse.text();
       console.log('[nlq-proxy] n8n raw response:', rawData.substring(0, 500));
 
       // Normalize response to standard format
       const reply = normalizeN8NResponse(rawData);
 
       const response: ChatResponse = { ok: true, reply };
 
       return new Response(JSON.stringify(response), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
 
     } catch (fetchError) {
       clearTimeout(timeoutId);
       
       const isTimeout = fetchError instanceof Error && fetchError.name === 'AbortError';
       console.error('[nlq-proxy] Fetch error:', isTimeout ? 'TIMEOUT' : fetchError);
 
       return new Response(JSON.stringify({
         ok: false,
         error: {
           code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
           message: isTimeout
             ? 'O assistente está demorando para responder. Por favor, tente novamente.'
             : 'Erro de conexão com o assistente. Tente novamente em alguns instantes.',
         },
       } as ChatResponse), {
         status: isTimeout ? 504 : 502,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
   } catch (error) {
     console.error('[nlq-proxy] Request error:', error);
 
     return new Response(JSON.stringify({
       ok: false,
       error: {
         code: 'INTERNAL_ERROR',
         message: 'Erro interno ao processar sua pergunta. Tente novamente.',
       },
     } as ChatResponse), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });