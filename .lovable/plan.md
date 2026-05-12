
# Chat assíncrono + simulação de "pensamento" do agente

## Problema

O webhook do n8n pode demorar **até 5 minutos ou mais** para responder. Hoje:

- A edge function `nlq-chat` aguarda síncronamente com timeout de **55s** → toda consulta longa falha com "Sem resposta após 55s".
- O front faz `fetch` único com `AbortController` de **70s** → mesma morte prematura.
- O `AgentThinking` mostra um cronômetro genérico até 30s e depois um aviso. Não há progressão visual real além disso.
- O usuário não vê que o agente está realmente trabalhando — só vê "..." e depois erro.

A arquitetura síncrona não cabe num agente que demora 5+ min. Precisamos passar para **fire-and-forget + Realtime + UI de pensamento progressiva**.

## Estratégia

### A) Edge function `nlq-chat` (async)

- Insere `user message` (status `complete`) e `assistant message` (status `processing`, `processing_started_at = now()`) imediatamente.
- Dispara o POST ao n8n em background com `EdgeRuntime.waitUntil(...)` e **retorna em <2s** com `{ user_message_id, assistant_id, status: 'processing' }` (HTTP 202).
- Timeout do fetch ao n8n sobe para **9 minutos** (540s) — bem acima do worst case de 5 min.
- Quando o n8n responder (ou falhar), faz `UPDATE chat_messages` setando `content`, `status='complete'|'error'`, `error_detail`, `completed_at`. O Realtime já existente no hook propaga para a UI sem polling.
- Logs estruturados: `request_in`, `bg_start`, `bg_done`, `bg_fail` com elapsed.

### B) Hook `useChatMessages`

- `sendMessage` deixa de tratar `data.reply.text` no retorno do `fetch`. Passa a apenas:
  1. Inserir placeholders otimistas (igual hoje).
  2. Chamar a edge function (espera <2s; timeout client baixo de 15s só para a confirmação inicial).
  3. Trocar IDs temporários pelos reais; manter status `processing` até o Realtime UPDATE chegar.
- Realtime UPDATE já está implementado e vai preencher `content`/`status` quando o n8n terminar — sem mudanças aqui.
- Adicionar **safety net no client**: se passar 12 min sem update, marca local como erro ("A consulta demorou mais que o esperado") e oferece retry. (A função SQL `report_client_timeout` já existe.)
- Detectar mensagens `processing` que ficaram órfãs ao recarregar a página: ao montar, recalcular `startedAt` a partir de `processing_started_at` e continuar a simulação visual.

### C) UI — Simulação de pensamento (`AgentThinking` em `ChatMessage.tsx`)

Substituir o cronômetro genérico por uma **timeline animada de etapas que evolui com o tempo**, dando a sensação de progresso real:

```text
0–3s     ▸ Conectando ao agente
3–10s    ▸ Interpretando sua pergunta
10–25s   ▸ Identificando views e período
25–60s   ▸ Consultando vw_dashboard_financeiro / pedidos
60–120s  ▸ Agregando e calculando indicadores
120–240s ▸ Cruzando dados e gerando insights
240s+    ▸ Finalizando análise (consulta complexa)
```

Implementação:
- Cada etapa é um item da lista; a etapa "atual" pulsa com dot animado, as anteriores ficam com check verde e cinza, as futuras ficam apagadas.
- Cronômetro `mm:ss` no canto direito, `tabular-nums`.
- Texto auxiliar muda a cada faixa (não só >30s).
- Após 4 min, aparece linha discreta: "consultas longas podem levar até ~5 min — você pode continuar usando o app, a resposta aparecerá automaticamente".
- Halo no avatar "N" continua animando enquanto `status === 'processing'`.
- Acessível: `aria-live="polite"` e a etapa ativa é anunciada.

### D) Estado `processing` em `ChatMessage`

- `showThinking` passa a valer também para `status === 'processing'` (hoje só pega `pending`/`streaming`).
- Quando a mensagem chega via Realtime UPDATE com `status='complete'`, faz fade-in do conteúdo Markdown e remove a timeline (transição de 200ms).

## Critérios de aceitação

- Enviar pergunta → resposta da edge function em <2s; placeholder visível imediatamente.
- Timeline de etapas avança visivelmente conforme o tempo passa, não trava em uma frase só.
- Consulta de 3–5 min finaliza normalmente; UI atualiza sozinha via Realtime.
- Recarregar a página no meio do processamento mantém a timeline rodando (lê `processing_started_at`).
- Falha real do n8n marca a bolha como erro com botão "Tentar novamente".
- Sem mais erro "O agente do n8n não respondeu em 55s" para consultas legítimas.

## Arquivos a alterar

- `supabase/functions/nlq-chat/index.ts` — async com `EdgeRuntime.waitUntil`, retorna 202.
- `src/hooks/useChatMessages.ts` — não bloqueia esperando reply; safety client de 12 min; restaura `startedAt` de mensagens em `processing` no load.
- `src/components/chat/ChatMessage.tsx` — `AgentThinking` vira timeline multi-etapa; trata `processing`.

Sem mudanças de schema (todas as colunas necessárias já existem em `chat_messages`).
