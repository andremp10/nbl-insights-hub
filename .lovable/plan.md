
# Plano: Callback assíncrono do n8n → Lovable

Hoje o `nlq-chat` faz POST no n8n e **aguarda** a resposta no mesmo request (até 9 min) para dar UPDATE no `chat_messages`. Isso é frágil: timeouts de runtime, conexões caindo, retries duplicados.

A solução robusta é inverter o fluxo final: o **n8n responde rápido** (acknowledge) e, quando o agente terminar, **chama um webhook nosso** com o resultado. Esse webhook é a nova edge function `nlq-callback`.

## Fluxo novo (passo a passo)

```text
[Front] --POST--> nlq-chat
   1. valida auth + sessão
   2. cria user_message (complete) + assistant_message (processing)
   3. dispara POST no n8n com:
        assistant_id, session_id, user_id, message, context,
        callback_url, callback_token
   4. retorna 202 imediatamente

[n8n] processa o agente (pode levar minutos)
   5. quando terminar, faz POST em nlq-callback com:
        assistant_id, callback_token, status, reply, error?

[nlq-callback]
   6. valida token + assinatura
   7. valida que assistant_id existe e está em 'processing'
   8. UPDATE chat_messages -> content/status/error_detail/completed_at
   9. retorna 200 ok

[Front] recebe UPDATE via Supabase Realtime e renderiza a resposta
```

## 1) Nova edge function `nlq-callback`

**Endpoint público** (sem JWT do usuário — n8n não tem sessão), protegido por **token compartilhado**.

### Segredo
- Adicionar runtime secret: `NLQ_CALLBACK_TOKEN` (string aleatória longa).
- O n8n guarda esse token e envia no header `X-Callback-Token`.
- `nlq-chat` lê o mesmo segredo e passa `callback_url` + `callback_token` no payload do n8n (alternativa: o n8n já tem o token configurado direto no workflow — preferível por segurança).

### Parâmetros aceitos (POST JSON)
Obrigatórios:
- `assistant_id` (uuid) — id da mensagem assistant em `processing`
- `status` (`'complete' | 'error'`)

Quando `status='complete'`:
- `reply` (string) **ou** `reply.text` (string) — texto final em Markdown

Quando `status='error'`:
- `error` (string) — mensagem amigável para o usuário

Opcionais (futuro, não obrigatórios para funcionar):
- `metadata` (jsonb) — guardar em `chat_messages.metadata` (highlights, chart_payloads, suggested_actions, tokens_usados, modelo, latency_ms…)
- `request_id` (uuid) — bate com `chat_messages.request_id` para idempotência extra

### Headers
- `X-Callback-Token: <NLQ_CALLBACK_TOKEN>` → obrigatório
- `Content-Type: application/json`

### Validações
1. Método `POST`, CORS liberado.
2. `X-Callback-Token` igual a `NLQ_CALLBACK_TOKEN` (timing-safe compare). Se não, `401`.
3. Body JSON válido com `assistant_id` + `status`. Se não, `400`.
4. Buscar a mensagem com service-role:
   - se não existir → `404`
   - se já estiver `complete`/`error` → `200 { duplicate: true }` (não sobrescreve, idempotente)
5. UPDATE:
   - `content = reply text`
   - `status = complete | error`
   - `error_detail = error || null`
   - `metadata = metadata || null` (se a coluna existir; checar antes)
   - `completed_at = now()`
6. Resposta: `200 { ok: true }`.

### Resposta de erro padrão
`{ ok: false, error: { code, message } }` com HTTP correto (400/401/404/500). Sempre incluir `corsHeaders`.

### Logs estruturados
`callback_in`, `callback_ok`, `callback_duplicate`, `callback_unauthorized`, `callback_not_found`, `callback_update_failed`.

## 2) Ajustes no `nlq-chat`

- Manter inserção de `user_message` + `assistant_message (processing)` e retorno `202`.
- No payload enviado ao n8n, **adicionar**:
  - `callback_url`: URL pública do `nlq-callback` (montada a partir de `SUPABASE_URL` → `${SUPABASE_URL}/functions/v1/nlq-callback`)
  - `callback_token`: valor de `NLQ_CALLBACK_TOKEN` (opcional se o n8n já souber, recomendado para reduzir config no n8n)
  - `assistant_id`, `session_id`, `user_id`, `message`, `context`, `timezone`, `request_id`
- **Remover** a espera longa: o `processInBackground` agora só precisa garantir que o POST inicial chegou ao n8n. Sugestão:
  - Timeout curto (ex.: 30s) só para o **acknowledge** do n8n (n8n responde 200 imediato no nó "Respond to Webhook").
  - Se o ack falhar/timeout, marca a assistant message como `error` ("não foi possível disparar o agente"). Caso contrário, deixa em `processing` aguardando o callback.
- A função SQL `expire_stuck_processing_messages` (já existe, 12 min) continua sendo o safety net se o callback nunca chegar.

## 3) Configuração no n8n (orientação ao usuário)

No workflow do agente:
1. Primeiro nó "Respond to Webhook" → responde 200 imediato (ack).
2. No fim do fluxo, adicionar nó **HTTP Request**:
   - Method: `POST`
   - URL: `{{ $json.callback_url }}` (vinda no payload) ou hardcoded
   - Headers: `X-Callback-Token: {{ $json.callback_token }}` (ou variável do n8n)
   - Body JSON:
     ```json
     {
       "assistant_id": "{{ $json.assistant_id }}",
       "status": "complete",
       "reply": "{{ $node['Agent'].json.output }}"
     }
     ```
   - Branch de erro: enviar `status: "error"` + `error: "<mensagem>"`.

## 4) Segredo necessário

Pedir para adicionar em runtime secrets:
- `NLQ_CALLBACK_TOKEN` — uma string aleatória de 48+ chars (gerar com `openssl rand -hex 32`).

## 5) Sem mudanças no front

O `useChatMessages` já escuta UPDATEs via Realtime e renderiza quando `status` muda para `complete`/`error`. Nenhuma mudança de UI necessária.

## 6) Testes

- `supabase--curl_edge_functions` em `nlq-callback`:
  - sem token → 401
  - token errado → 401
  - assistant_id inexistente → 404
  - happy path com `status='complete'` → 200 e UPDATE refletido
  - segundo POST com mesmo assistant_id → `{duplicate:true}`, sem sobrescrever.

## Arquivos

- **Novo:** `supabase/functions/nlq-callback/index.ts`
- **Editado:** `supabase/functions/nlq-chat/index.ts` (payload + ack curto)
- **Secret:** `NLQ_CALLBACK_TOKEN` (a adicionar)

## Próxima pergunta antes de implementar

Confirmação do nome `NLQ_CALLBACK_TOKEN` e se você prefere que o `nlq-chat` envie `callback_token` no payload (mais simples no n8n) ou que o n8n guarde o token em variável dele (mais seguro, payload não trafega o segredo).
