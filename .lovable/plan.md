

# Plano — Streaming do Chat via Edge Function (SSE)

## O que voce precisa fazer no n8n

**Sim, troque o node final para "Respond to Webhook"** com a opcao de streaming habilitada. Sem isso, o n8n fecha a conexao HTTP imediatamente e nao ha stream para consumir.

## Arquitetura nova

```text
Frontend (fetch) ──POST──▶ nlq-proxy (Edge Function)
                                │
                                ├─ Insere user msg no Supabase
                                ├─ Busca contexto (10 msgs)
                                ├─ Chama n8n webhook (aguarda stream)
                                │
                          n8n retorna SSE
                                │
                                ├─ Cada chunk ──▶ repassa ao Frontend via SSE
                                │
                          Stream finaliza
                                │
                                └─ Insere msg assistant completa no Supabase
                                └─ Fecha conexao

Frontend: le chunks progressivamente, atualiza mensagem em tempo real
```

## Mudancas por arquivo

### 1. `supabase/functions/nlq-proxy/index.ts` — Reescrever

**Remover**: fire-and-forget, insert de pending msg, waitUntil
**Manter**: idempotencia 10s, insert user msg, busca contexto

Novo fluxo:
1. Validar input + dedup
2. Inserir user message no Supabase
3. Buscar contexto (10 msgs)
4. Chamar n8n webhook com fetch, receber body como ReadableStream
5. Criar `TransformStream` que repassa chunks SSE ao frontend
6. Ao final do stream, inserir mensagem completa do assistant no Supabase com status `complete`
7. Em erro, inserir com status `error`
8. Response com `Content-Type: text/event-stream`

Cada chunk enviado ao frontend no formato:
```
data: {"token":"texto parcial"}\n\n
```
Ao final:
```
data: [DONE]\n\n
```

### 2. `src/hooks/useChatMessages.ts` — Reescrever sendMessage

**Remover**: `supabase.functions.invoke` (nao suporta streaming), pending timeouts
**Manter**: Realtime subscription (para sessoes recarregadas), retryMessage

Novo `sendMessage`:
1. Inserir mensagem user localmente (optimistic com id temporario `opt-`)
2. Criar mensagem assistant vazia localmente com status `streaming`
3. Fazer `fetch` direto para `https://bcypejzqbcwibvtbbfor.supabase.co/functions/v1/nlq-proxy` com headers de auth
4. Ler `response.body` como ReadableStream via `getReader()`
5. Parsear linhas SSE (`data: {...}`) e extrair tokens
6. A cada token, acumular no content da mensagem assistant via `setMessages`
7. Ao receber `[DONE]`, marcar status `complete`
8. Em erro mid-stream, marcar status `error`

O Realtime subscription continua ativo para:
- Reconciliar mensagem do usuario (substituir `opt-` pelo ID real do banco)
- Sessoes recarregadas que tenham pending antigos

### 3. `src/hooks/useChatMessages.ts` — Interface ChatMessage

Adicionar `'streaming'` como status local:
```typescript
status: 'pending' | 'streaming' | 'complete' | 'error';
```

### 4. `src/components/chat/ChatMessage.tsx` — Adaptar para streaming

- Remover `useTypewriter` — o streaming ja entrega tokens progressivamente
- Quando `status === 'streaming'`: renderizar markdown do content atual + cursor pulsante
- Quando `status === 'complete'`: renderizar markdown normalmente (sem cursor)
- Manter tudo o mais (copy, retry, highlight card, etc.)

### 5. `src/pages/Chat.tsx` — Auto-scroll durante streaming

- Remover logica de `animateId` (nao ha mais typewriter)
- Auto-scroll: observar mudancas no content da ultima mensagem streaming e rolar para baixo
- O StatusBadge ja mostra "Consultando..." quando `sending=true`, manter

### 6. `src/hooks/useTypewriter.ts` — Remover

Nao e mais utilizado por nenhum componente.

## Detalhes tecnicos

### Construcao da URL da Edge Function no frontend
```typescript
const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nlq-proxy`;
```

### Headers necessarios no fetch
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${session.access_token}`,
  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}
```

### Parser SSE no frontend
```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // parse lines, extract "data: ..." events
}
```

### Edge Function — repasse de stream
A Edge Function le o body do n8n como stream e repassa ao frontend. O conteudo acumulado e salvo no Supabase ao final.

## Resumo

| Arquivo | Acao |
|---------|------|
| `supabase/functions/nlq-proxy/index.ts` | Reescrever — streaming proxy SSE |
| `src/hooks/useChatMessages.ts` | Reescrever sendMessage com fetch + stream reader |
| `src/components/chat/ChatMessage.tsx` | Remover typewriter, suportar status `streaming` |
| `src/pages/Chat.tsx` | Remover animateId, scroll continuo durante stream |
| `src/hooks/useTypewriter.ts` | Deletar |

