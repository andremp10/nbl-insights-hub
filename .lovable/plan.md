# Correção: usuário sem resposta quando o cliente desconecta

## Diagnóstico (com base em logs)

A pergunta de 30/04 às 03:10:02 UTC (sessão `17684b8a-...`, "Faça um resumo do status atual de todos os pedidos…") foi salva como mensagem do usuário, mas **nenhuma mensagem do assistente foi criada** — nem em `processing`, nem `complete`, nem `error`. O usuário ficou olhando o chat sem resposta nem aviso de erro.

Logs do edge function `nlq-proxy` mostram:
- `03:10:04` — n8n iniciou stream (`begin`)
- `03:10:06` — chunks #2 e #3 chegaram
- `03:10:03` — `Http: connection closed before message completed` (cliente fechou a conexão SSE antes do n8n terminar)
- **Nunca apareceu** `Stream done` nem `Final content approved` para essa request

### Causa raiz

A arquitetura atual do `nlq-proxy/index.ts` tem dois defeitos combinados:

1. **A mensagem do assistente só é inserida em `finalize()`**, que só roda quando o stream termina com sucesso. Se o cliente desconectar antes, o INSERT nunca acontece.
2. **No `catch`, suprimimos a criação de uma row de erro** quando `isClosedError(err)` é true (linha 768). Isso foi feito antes para evitar "phantom errors", mas combinado com o item 1 deixa a sessão em estado fantasma: pergunta do usuário sem nenhuma resposta correspondente.

Resultado: qualquer desconexão (troca de aba, refresh, perda de rede momentânea, navegação) durante o processamento = silêncio total no DB.

## Solução

Garantir que **toda pergunta tenha uma row de resposta no DB**, independentemente do que aconteça com a conexão SSE.

### Mudanças em `supabase/functions/nlq-proxy/index.ts`

1. **Pré-criar a mensagem do assistente em `status: 'processing'`** logo após inserir a mensagem do usuário (antes de iniciar o stream). Capturar `assistantMsgId`.
   - Inclui `reply_to_message_id = userMsg.id` e `processing_started_at = now()` para alinhar com o já existente RPC `expire_stuck_processing_messages` (que limpa rows travadas após 12 min).

2. **Trocar INSERT por UPDATE em `finalize()`**: atualizar a row `assistantMsgId` para `complete` (com `content`) ou `error` (com `error_detail`), setando `completed_at = now()`. Isso elimina rows duplicadas e funciona mesmo com cliente desconectado.

3. **Tornar o trabalho do n8n resiliente à desconexão**: envolver o processamento principal em uma Promise que continua rodando via `EdgeRuntime.waitUntil(...)`. O `ReadableStream` apenas reflete o progresso para o cliente conectado; quando o cliente fecha, o `controller.enqueue` falha silenciosamente (já tratado por `controllerClosed`), mas o loop de leitura do n8n e o `finalize()` continuam até o fim e atualizam o DB.

4. **No `catch` global**: sempre executar `finalize('', 'error', '...')` em vez de suprimir. Como `finalize` agora faz UPDATE, não há risco de "phantom error" duplicada — se o sucesso já rodou, a row já está `complete` e o catch não será atingido.

5. **Implementar `cancel()` no ReadableStream**: marcar `controllerClosed = true` mas NÃO abortar o n8nFetch. O processamento continua até persistir a resposta.

### Frontend (`src/hooks/useChatMessages.ts`)

Já tem dedupe de phantom errors — agora vira inofensivo, pois o backend não cria mais rows duplicadas (faz UPDATE). Manter como defesa adicional, sem mudanças.

### Resultado

- Cliente conectado durante todo o stream: comportamento idêntico ao atual (recebe steps + resposta final via SSE).
- Cliente desconecta no meio: backend continua, atualiza a row `processing → complete` (ou `error`), e na próxima visita à sessão (via Realtime ou ao recarregar) a resposta aparece.
- n8n falha / timeout / conexão recusada: row vai para `error` com mensagem amigável — usuário vê o balão de erro em vez de silêncio.

## Fora de escopo

- Não mexer no fluxo async (`nlq-proxy-async`) — esta correção é só do path SSE legado em uso.
- Não mudar n8n nem views Supabase.
- Não tocar em hooks de dashboard.
