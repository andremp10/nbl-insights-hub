## Contexto

Erro observado em produção: `TypeError: The stream controller cannot close or enqueue` em `nlq-proxy/index.ts:509`, seguido de uma "mensagem de erro fantasma" no chat **mesmo com a resposta correta já salva no banco** (visível na captura do usuário: a tabela do ranking de clientes apareceu, e logo abaixo veio um balão vermelho "The stream controller cannot close or enqueue").

### Causa raiz

1. A resposta do n8n demorou ~50s e tinha 1122 chars.
2. Antes do `finalize()` terminar de fazer streaming token-a-token (loop com `setTimeout(10ms)` por batch), o cliente fechou a conexão SSE (`Http: connection closed before message completed`).
3. `finalize()` continuou rodando: o `INSERT` da assistant message com `status: complete` foi executado **com sucesso** (linha 519), mas em seguida o `emitSSE({type:'token'})` e o `controller.enqueue([DONE])` explodiram porque o controller já estava fechado.
4. O catch externo no `start()` chamou novamente o caminho de erro → criou uma **segunda assistant message com `status: error`** no banco. Daí o balão vermelho fantasma.

A arquitetura async v4 já implementada (atrás do flag `VITE_CHAT_ASYNC_MODE`) elimina este cenário, mas ainda não está ativa porque depende do n8n ser reconfigurado para "Respond Immediately". Enquanto isso, precisamos estabilizar o caminho SSE legado.

## Mudanças

### 1. `supabase/functions/nlq-proxy/index.ts` — guards defensivos

- Adicionar flag local `controllerClosed = false`. Toda função `emitSSE`, `emitStep` e `finalize` checa essa flag antes de tentar enfileirar.
- Tratar `TypeError` específico de "controller cannot close or enqueue" como **sinal de cliente desconectado**, não como erro de processamento. Setar `controllerClosed = true` e parar de tentar emitir.
- Em `finalize()`:
  - Se `status === 'complete'`, fazer **primeiro** o `INSERT` da assistant message (já é assim) e **depois** tentar o streaming token-a-token. Se o stream falhar, o conteúdo já está persistido — apenas logar e sair sem reentrar no caminho de erro.
  - Envolver o loop de tokens (linhas 509-515) num try/catch que detecta controller fechado e quebra o loop silenciosamente em vez de propagar.
  - Mover o `controller.close()` final para um try/catch que não relança.
- No `catch` externo do `start()` (linha ~699), **antes** de inserir uma assistant message com `status: error`, verificar se já existe uma assistant message com `status: complete` para o mesmo `user_message_id` criada nos últimos 30s. Se existir, suprimir o INSERT de erro (apenas logar).

### 2. `src/hooks/useChatMessages.ts` — dedupe defensivo no cliente

- No subscribe Realtime / refetch, se chegarem duas assistant messages para o mesmo `user_message_id` (ou em janela de <5s) sendo uma `complete` e outra `error`, manter apenas a `complete` na UI. (Defesa em profundidade, caso o backend crie a fantasma mesmo assim.)

### 3. Acelerar o flush final (mitigação)

- Em `nlq-proxy`, aumentar `FINAL_TOKEN_BATCH_SIZE` e/ou remover o `setTimeout(10ms)` entre batches. O streaming token-a-token do conteúdo final é puramente cosmético (o conteúdo já está pronto) — não precisa simular digitação a 10ms/batch para 1100 chars. Reduzir esse loop a uma única emissão (`emitSSE({type:'token', token: content})`) elimina a janela de 1+ segundo onde o cliente pode desconectar.

### 4. Não tocar na arquitetura async v4

- Nenhuma mudança em `nlq-proxy-async`, no flag `VITE_CHAT_ASYNC_MODE`, ou no caminho async de `useChatMessages`. Esta é uma correção cirúrgica no caminho SSE legado.

## Resultado esperado

- Quando o cliente fecha a conexão antes do flush final, o backend **não** cria mais uma assistant message de erro fantasma.
- O loop de "digitação" do conteúdo final é instantâneo, eliminando a janela de race.
- Mesmo se a fantasma escapar, o frontend a esconde.
- A tabela e o insight visíveis na captura continuam aparecendo corretamente; o balão vermelho some.

## Não inclui

- Ativar `VITE_CHAT_ASYNC_MODE=true` (ainda depende de você reconfigurar o n8n conforme combinado).
- Mudanças de schema ou novas migrations.
- Alteração nos hooks de dashboard (cache ETL recém-implementado).
