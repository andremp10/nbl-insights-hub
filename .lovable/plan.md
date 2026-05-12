# Resposta do agente não aparece após callback

## Diagnóstico

Verifiquei o último callback (assistant `a47dd844-…`) e está tudo correto no backend:
- Edge function `nlq-callback` retornou `ok status=complete len=2178`
- A linha em `chat_messages` está com `status=complete`, `content` com 2178 chars e `completed_at` preenchido

Ou seja, o problema é **no client**: o evento Realtime de UPDATE não está atualizando a mensagem na tela. Encontrei duas causas prováveis:

### Causa 1 — `REPLICA IDENTITY` da tabela `chat_messages` está como DEFAULT
```
relreplident = 'd'  (default = só PK)
```
Com isso o Postgres só envia a PK no WAL para UPDATE. O Supabase Realtime entrega o evento, mas `payload.new` chega com campos faltando (sem `content`, `status`, `completed_at`). O handler em `useChatMessages.ts` faz `{ ...x, ...m }` — se `m.status` vier vazio/igual, nada muda visualmente, e `content` continua "" do estado `processing`.

Para Realtime entregar a linha completa em UPDATE é necessário `REPLICA IDENTITY FULL`.

### Causa 2 — Não há fallback se o evento Realtime se perder
Se a conexão WebSocket cair entre o `bg_ack` e o callback do n8n (até ~2 min depois), a UI fica presa em "processing" para sempre (até o safety timer de 12 min marcar erro), mesmo com a resposta já salva no banco.

## Plano

### 1. Migração SQL — `REPLICA IDENTITY FULL`
```sql
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
```
Garante que UPDATE via Realtime traga o registro inteiro (`content`, `status`, `error_detail`, `completed_at`).

### 2. Fallback de polling no client — `src/hooks/useChatMessages.ts`
Quando uma mensagem assistant entra em `processing` (após o `bg_ack` ou após reload), além do `armSafetyTimer` (12 min → erro), agendar um **poller leve**:

- A cada 5s, fazer um SELECT pontual em `chat_messages` por `id = realAssistantId`
- Se vier `status === 'complete'` ou `'error'`, atualizar o estado local e parar o poller
- Parar também quando o Realtime UPDATE chegar antes (usar a mesma `clearSafetyTimer`/novo `clearPoller`)
- Limite máximo: parar após `CLIENT_HARD_TIMEOUT_MS` (12 min) — o safety timer cuida do resto

Isso cobre:
- Perda de evento Realtime (rede instável, aba em background, suspensão do laptop)
- Casos onde o INSERT Realtime chegou mas o UPDATE não

### 3. Recuperação ao montar / trocar de sessão
No `useEffect` que carrega histórico (já existe), além de `armSafetyTimer`, **iniciar o poller** para qualquer mensagem `processing` encontrada — assim, ao reabrir a aba, a UI converge mesmo sem evento Realtime.

## Arquivos afetados
- Nova migração SQL (REPLICA IDENTITY FULL em `chat_messages`)
- `src/hooks/useChatMessages.ts` — adicionar `pollersRef`, funções `armPoller`/`clearPoller`, integrar nos 3 pontos (sendMessage após bg_ack, load history, realtime UPDATE handler limpa o poller)

## Fora de escopo
- Mudanças no agente n8n
- Mudanças no `nlq-callback` (já está correto)
- Refatoração visual do `ChatMessage.tsx` (separado)
