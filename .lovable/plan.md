

# Plano — Otimizar performance e fluidez do Chat

## Problemas identificados

### 1. Re-renders excessivos no `Chat.tsx`
- `ChatComposer` e definido inline no mesmo arquivo, mas nao e memo. Cada mudanca de state em `Chat` (messages, sending, etc.) re-renderiza o composer inteiro.
- `messages.map()` recria callbacks `onRetry` e `onFollowUp` a cada render — invalida o `memo` do `ChatMessage`.
- `scrollIntoView` dispara a cada mudanca em `messages` ou `sending`, mesmo sem novos itens.

### 2. Typewriter causa renders a cada 8ms
- `useTypewriter` chama `setDisplayedText` ~125x/s. Como `ReactMarkdown` com `remarkGfm` e pesado (parser markdown completo), cada update re-parseia todo o conteudo.
- Solucao: durante a animacao, renderizar texto puro (sem markdown). So parsear markdown apos finalizar o typewriter.

### 3. `motion.div` em cada mensagem
- Cada `ChatMessage` tem `motion.div` com `initial/animate`. Para mensagens historicas (ja carregadas), essa animacao e desnecessaria — cria overhead de layout/paint.
- Solucao: so usar `motion.div` quando `animate=true`, usar `div` normal caso contrario.

### 4. Realtime do `useChatSessions` re-fetcha tudo
- O channel `chat_sessions_changes` ouve `event: '*'` e chama `fetchSessions()` a cada evento. Qualquer UPDATE (incluindo o trigger de `last_message_at`) causa um SELECT completo.
- Solucao: usar o payload do evento para atualizar localmente em vez de re-fetchar.

### 5. `usePedidosData()` carregado dentro de `OrdersTable` (importado no Chat via modais)
- Nao impacta diretamente o chat, mas vale verificar que nao esta sendo importado transitivamente.

## Solucao proposta

### A. `ChatMessage` — Markdown so apos typewriter
- Durante `isTyping`, renderizar `contentToRender` como texto puro (com `<pre>` ou `<span>` simples com `whitespace-pre-wrap`)
- Apos `isTyping=false`, renderizar `ReactMarkdown` normalmente
- Isso elimina ~125 re-parses/s de markdown

### B. `ChatMessage` — Condicional motion vs div
- Se `animate=false` (mensagens historicas): usar `<div>` simples em vez de `<motion.div>`
- Manter `motion.div` apenas para mensagens novas

### C. `Chat.tsx` — Estabilizar callbacks
- Extrair `ChatComposer` para fora e envolver em `memo` (ja esta fora, mas garantir memo)
- Usar `useCallback` com refs para `onRetry` e `onFollowUp` passados ao map
- Scroll: usar ref para contar mensagens e so scrollar quando count muda

### D. `useChatSessions` — Update local em vez de re-fetch
- No handler do Realtime, usar o `payload.new` para atualizar o state localmente (INSERT, UPDATE, DELETE)
- Manter `fetchSessions` apenas para o load inicial

### E. `useTypewriter` — Chunks maiores
- Aumentar chunk maximo de 5 para 10-15 caracteres
- Reduzir frequencia de `setDisplayedText` (agrupar mais chars por frame)

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/chat/ChatMessage.tsx` | Texto puro durante typing; div condicional |
| `src/hooks/useTypewriter.ts` | Chunks maiores, menos setState |
| `src/pages/Chat.tsx` | Estabilizar callbacks, smart scroll |
| `src/hooks/useChatSessions.ts` | Update local via Realtime payload |

