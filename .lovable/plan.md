## Diagnóstico

Confirmei nos logs do edge function que **o erro `userClient.auth.getClaims is not a function` parou após o último deploy (01:47)** — então a função autentica corretamente agora. O que ainda falha vem de **três causas distintas**:

### 1. Workflow do n8n está INATIVO (causa principal do "Failed")
Sua segunda screenshot mostra o nó "Respond to Webhook" com **"No input data"** no editor do n8n. Isso significa que nenhuma execução chegou até esse nó. Em n8n, um Webhook em modo Production só responde se o **workflow estiver ativado** (toggle "Active" no canto superior direito). Em modo Test, ele só responde uma vez após clicar "Listen for test event".

➜ Resultado: nossa edge function fica esperando até o `AbortController` disparar em 110s e o cliente do supabase-js cai em "Failed to send a request to the Edge Function" (timeout interno do `functions.invoke`, ~60s).

### 2. Mensagens duplicadas no chat
Cada vez que o usuário aperta enviar, criamos um novo placeholder. Os erros antigos ficam na tela formando "lixo visual" (3 bolhas laranjas idênticas + 3 erros). Não estamos limpando tentativas anteriores nem desativando reenvios em sequência.

### 3. Confirmação visual fraca
Hoje aparece um chip "Consultando…" no header e o `AgentThinking` no corpo, mas **sem cronômetro** e sem distinguir "fila" de "agente respondendo". Quando o agente demora, o usuário não sabe se algo está acontecendo.

---

## Plano

### A) Ação manual (do seu lado, no n8n)

1. Abrir o workflow `nbl_agente` em `flows-nbl.golfine.com.br`.
2. Garantir que o **toggle "Active"** (canto superior direito) está LIGADO. Sem isso, o webhook de produção (`webhook-nbl.golfine.com.br/...`) sempre vai ficar pendurado.
3. Confirmar que o nó Webhook inicial está em modo **POST** e que existe um caminho até o nó "Respond to Webhook" para TODOS os branches (sucesso e erro).
4. Após ativar, refazer o teste no chat.

### B) Edge function `nlq-chat` (mais resiliente e instrumentada)

1. **Reduzir timeout do fetch ao n8n para 55s** (em vez de 110s) — assim a função sempre responde antes do `wall_clock_timeout` (150s) e antes do timeout interno do `supabase-js invoke` (~60s no client). Se o n8n estiver inativo, o usuário vê o erro em <1min em vez de "Failed to fetch" cego.
2. **Logs estruturados** (`console.log`) marcando: chegada da request, início do POST ao n8n, recebimento da resposta, status final. Facilita debug futuro.
3. **Sempre retornar HTTP 200** com `{status:'error', error_detail:'...'}` em qualquer falha do n8n — assim o `supabase.functions.invoke` no front não cai no caminho `error` por non-2xx, recebe a mensagem amigável.
4. Mensagem de erro de timeout específica: *"O agente do n8n não respondeu em 55s. Verifique se o workflow está ativo."* (visível para o usuário no card de erro).

### C) Hook `useChatMessages` (anti-duplicata e UX)

1. Trocar `supabase.functions.invoke` por `fetch` direto ao endpoint da função, com `AbortController` próprio de **70s** no cliente — assim não dependemos do timeout misterioso do supabase-js e podemos mostrar mensagem de erro consistente.
2. Antes de enviar nova mensagem, **remover automaticamente do estado local as últimas mensagens com `status='error'` consecutivas** (limpa o lixo visual sem apagar do banco).
3. Quando `status='error'` aparece, **desabilitar o reenvio automático** e exigir clique explícito em "Tentar novamente". O botão fica em estado "loading" enquanto o request anterior estiver vivo.
4. `client_request_id` já garante idempotência no servidor; vamos garantir que se o front re-tentar com o mesmo id, atualiza o placeholder existente em vez de criar outro.

### D) Confirmação visual no `ChatMessage` / `AgentThinking`

1. Adicionar **cronômetro elapsed** ("Aguardando o agente · 12s") dentro do AgentThinking, atualizando a cada segundo. Isso prova que o sistema está vivo.
2. Estados claros em sequência:
   - `0–2s`: "Enviando para o agente…"
   - `2–10s`: "Agente processando sua consulta…"
   - `10–30s`: "Buscando dados nas views…"
   - `>30s`: "Consulta complexa, ainda processando ({n}s)…"
3. Toast curto **"Pergunta enviada ao agente"** logo após o submit, dando feedback imediato.
4. No card de erro, mostrar o **tempo decorrido até falhar** ("Sem resposta após 55s") + botão "Tentar novamente" com mesma `client_request_id` para idempotência.
5. Adicionar pequeno botão **"Limpar erros anteriores"** acima do input quando há ≥2 erros na sessão, para o usuário não precisar criar conversa nova.

---

## Detalhes técnicos

```text
front (ChatInput)
   │ submit  →  optimistic insert (user + assistant pending com cronômetro)
   ▼
fetch POST /functions/v1/nlq-chat   (timeout cliente 70s, AbortController)
   ▼
edge nlq-chat
   │ log "request_in"
   │ insert user message (idempotente por client_request_id)
   │ fetch n8n  (timeout 55s, AbortController)
   │ log "n8n_done" ou "n8n_timeout"
   │ insert assistant (status complete|error)
   ▼
HTTP 200 { assistant_id, reply, status, error_detail }
```

Caminhos cobertos:
- **n8n inativo**: erro em <60s com mensagem clara.
- **n8n lento mas responde**: até 55s, resposta normal.
- **Reenvio**: mesma `client_request_id` retorna a resposta já gravada (sem criar dupla).
- **Click duplo no botão**: bloqueado pelo `submitRef` + `sending`.
- **Sessão suja com erros**: botão de limpar oculta erros anteriores no estado local.

## Critérios de aceite

- Com workflow do n8n ativo: pergunta → resposta em uma única bolha, em <60s.
- Com workflow inativo: card de erro explícito em ~55s ("Workflow do n8n parece inativo…"), nada de "Failed to fetch".
- Cronômetro visível durante a espera (segundos contando).
- Reenviar a mesma pergunta após erro não cria duplicata na lista.
- Toast "Pergunta enviada ao agente" aparece ao submeter.

