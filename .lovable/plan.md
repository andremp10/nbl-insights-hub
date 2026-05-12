## Objetivo

Eliminar toda a complexidade atual de streaming SSE e fila assíncrona (status `processing`, polling, watchdog, soft/hard timeout) que está causando mensagens travadas no Supabase. Voltar ao padrão simples: o front chama o edge function → o edge function chama o webhook do n8n (`respondToWebhook`) e aguarda a resposta final → grava `assistant` com `status='complete'` e devolve o texto. Sem SSE, sem polling, sem `nlq-proxy-async`.

## Causa do problema atual

O fluxo async grava `assistant` em `status='processing'` esperando que o n8n confirme depois via outro canal. Quando algo falha no meio (timeout do edge runtime, n8n não confirma, perda de conexão), a mensagem fica presa em `processing` e o usuário nunca vê a resposta. Há ainda dois proxies (`nlq-proxy` SSE + `nlq-proxy-async`) e múltiplos timers no front que se sobrepõem.

## Arquitetura nova (simples)

```text
Front (ChatInput)
   │  supabase.functions.invoke('nlq-chat', { message, session_id, context })
   ▼
Edge Function nlq-chat (síncrono)
   │  valida JWT + ownership da sessão
   │  insere user message (status='complete')
   │  POST n8n webhook (await fetch)  ← respondToWebhook devolve JSON final
   │  insere assistant message (status='complete', content=reply.text)
   ▼
Retorna { reply, assistant_id } pro front
   │
   ▼
Front exibe imediatamente (Realtime já replica em outras abas)
```

Sem `processing`, sem `streaming`, sem `request_id`, sem polling.

## Mudanças

### Backend (Supabase)

1. Criar edge function `nlq-chat` (síncrona):
   - Valida JWT via `getClaims`.
   - Valida que a sessão pertence ao usuário.
   - Insere mensagem do usuário (`role='user'`, `status='complete'`).
   - Faz `await fetch(N8N_WEBHOOK_URL, { method:'POST', body: { app, session_id, timezone, message, context } })` com timeout de ~120s.
   - Lê JSON `{ ok, reply: { text, highlights?, suggested_actions?, chart_payloads? }, error? }`.
   - Insere mensagem do assistente (`role='assistant'`, `status='complete'` ou `status='error'` se `ok=false`), `content = reply.text`.
   - Atualiza `last_message_at` da sessão (já existe trigger `sync_session_on_message`).
   - Retorna `{ assistant_id, reply }`.
   - CORS padrão; `verify_jwt=false` (validação manual no código).

2. Remover edge functions: `nlq-proxy` e `nlq-proxy-async`.

3. Migration de limpeza:
   - `UPDATE chat_messages SET status='error', error_detail='Mensagem migrada para novo modelo síncrono' WHERE status IN ('processing','streaming','pending');` para destravar histórico.
   - Manter as colunas `request_id`, `client_request_id`, `processing_started_at`, `reply_to_message_id` por enquanto (não quebra tipos), mas deixar de usar.
   - Manter funções `expire_stuck_processing_messages` e `report_client_timeout` (sem uso ativo, mas não removemos para evitar quebra).

### Frontend

4. Reescrever `src/hooks/useChatMessages.ts` (versão enxuta, ~150 linhas):
   - `loadMessages(sessionId)` — `select * from chat_messages` ordenado.
   - `sendMessage(text)`:
     - Optimistic insert no estado local de `user` + `assistant` placeholder com `status='pending'`.
     - `supabase.functions.invoke('nlq-chat', { body })`.
     - Substitui placeholder pelo retorno; em erro, marca o placeholder como `status='error'` com mensagem amigável.
   - Realtime subscription mantida (apenas para sincronizar entre abas; insere se id ainda não existe).
   - Remover: `ASYNC_MODE`, `STREAM_TIMEOUT_MS`, `RECOVERY_POLL_MS`, todos os timers/poll/SSE, `startAsyncTracking`, `recoveryTimer`, `EventSource`, etc.

5. Simplificar `src/components/chat/ChatMessage.tsx` e `AgentSteps.tsx`:
   - Remover estados `streaming`/`processing`/`steps`/cronômetro.
   - Manter apenas `pending` (spinner curto enquanto `invoke` não retorna), `complete`, `error`.

6. `src/pages/Chat.tsx`: remover qualquer referência a `VITE_CHAT_ASYNC_MODE`, banners de "processando…", recovery, etc.

7. Variável `VITE_CHAT_ASYNC_MODE` deixa de ser usada (ignorada).

### Secrets

- Confirmar `N8N_WEBHOOK_URL` como secret no Supabase. Se já existir em código fixo, mover para secret. (Vou pedir para você adicionar/confirmar antes de implementar.)

## Detalhes técnicos

- Timeout do `fetch` para o n8n: `AbortController` com 110s (abaixo do limite de 150s do edge).
- Em caso de timeout/erro de rede: assistant gravado com `status='error'`, `error_detail='Tempo limite excedido. Tente novamente.'` e front exibe.
- Idempotência leve: continuar aceitando `client_request_id` opcional no body para evitar duplo-envio em double click; se já existir user message com mesmo `client_request_id` na sessão, devolve o assistant existente.
- Sem alterações no contrato JSON do n8n (mantém o mesmo payload e response definidos no Knowledge Base).

## Critérios de aceite

- Enviar mensagem → resposta aparece na tela em uma única atualização, sem estados intermediários longos.
- Nenhuma mensagem nova fica em `processing` no banco.
- Recarregar a página mostra o histórico completo, todas com `status='complete'` (ou `error`).
- Funções `nlq-proxy` e `nlq-proxy-async` removidas; apenas `nlq-chat` e `create-user` permanecem.
