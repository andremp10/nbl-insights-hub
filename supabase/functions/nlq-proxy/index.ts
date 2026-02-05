 const N8N_WEBHOOK_URL = "https://chez-n8n-webhook.jsf0kc.easypanel.host/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6";
 
 // Timeout de 150 segundos (limite máximo do Supabase Edge Functions)
 // O n8n usa "Respond to Webhook" que pode demorar para processar
 const TIMEOUT_MS = 150000;
 
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
 
 // Mensagens de erro padronizadas por código
 const ERROR_MESSAGES: Record<string, string> = {
   TIMEOUT: 'O assistente demorou para responder. Por favor, tente uma pergunta mais simples.',
   UPSTREAM_ERROR: 'O assistente não conseguiu processar sua pergunta. Tente novamente.',
   BAD_RESPONSE: 'Resposta inesperada do assistente. Tente novamente.',
   BAD_REQUEST: 'Mensagem inválida. Por favor, digite sua pergunta.',
   NETWORK_ERROR: 'Erro de conexão com o assistente. Tente novamente em alguns instantes.',
 };
 
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
       error: { code: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' } 
     }), {
       status: 405,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 
   try {
     const body: ChatRequest = await req.json();
     const startTime = Date.now();
     
     console.log('[nlq-proxy] Received request:', { 
       session_id: body.session_id, 
       message: body.message?.substring(0, 100),
       context: body.context,
     });
 
     // Validate required fields
     if (!body.message?.trim()) {
       return new Response(JSON.stringify({
         ok: false,
         error: { code: 'BAD_REQUEST', message: ERROR_MESSAGES.BAD_REQUEST },
       } as ChatResponse), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     // Forward to n8n with timeout
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
 
     try {
       const n8nPayload = {
         app: 'grafica_nbl_lovable',
         session_id: body.session_id || 'anonymous',
         timezone: body.timezone || 'America/Fortaleza',
         message: body.message.trim(),
         context: body.context || {},
       };
 
       console.log('[nlq-proxy] Forwarding to n8n (timeout: %dms):', TIMEOUT_MS, N8N_WEBHOOK_URL);
 
       const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(n8nPayload),
         signal: controller.signal,
       });
 
       clearTimeout(timeoutId);
 
       const duration = Date.now() - startTime;
       console.log('[nlq-proxy] n8n response status: %d (duration: %dms)', n8nResponse.status, duration);
 
       if (!n8nResponse.ok) {
         const errorText = await n8nResponse.text();
         console.error('[nlq-proxy] n8n error (status: %d):', n8nResponse.status, errorText);
         
         return new Response(JSON.stringify({
           ok: false,
           error: { 
             code: 'UPSTREAM_ERROR', 
             message: ERROR_MESSAGES.UPSTREAM_ERROR 
           },
         } as ChatResponse), {
           status: 502,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
       }
 
       const rawData = await n8nResponse.text();
       console.log('[nlq-proxy] n8n raw response (length: %d):', rawData.length, rawData.substring(0, 300));
 
       // Normalize response to standard format
       const reply = normalizeN8NResponse(rawData);
 
       const response: ChatResponse = { ok: true, reply };
 
       console.log('[nlq-proxy] Success - total duration: %dms', Date.now() - startTime);
 
       return new Response(JSON.stringify(response), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
 
     } catch (fetchError) {
       clearTimeout(timeoutId);
       
       const isTimeout = fetchError instanceof Error && fetchError.name === 'AbortError';
       const duration = Date.now() - startTime;
       console.error('[nlq-proxy] Fetch error (duration: %dms):', duration, isTimeout ? 'TIMEOUT' : fetchError);
 
       return new Response(JSON.stringify({
         ok: false,
         error: {
           code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
           message: isTimeout ? ERROR_MESSAGES.TIMEOUT : ERROR_MESSAGES.NETWORK_ERROR,
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
         code: 'BAD_RESPONSE',
         message: ERROR_MESSAGES.BAD_RESPONSE,
       },
     } as ChatResponse), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });