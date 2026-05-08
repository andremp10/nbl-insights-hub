## Objetivo

Melhorar a UX de espera do chat unificando o "thinking" inicial, os steps SSE e o streaming de tokens em uma única experiência fluida — sem promessas de tempo (remover "3 a 8 segundos"), com feedback imediato no envio e transições suaves entre fases.

## Diagnóstico

Hoje a espera tem 3 fases visuais desconectadas:

1. `AgentThinking` (dots + frase rotativa) — exibido enquanto não chega 1º step nem 1º token. Mostra **"Costuma levar de 3 a 8 segundos."** (impreciso e gera ansiedade).
2. `AgentSteps` (timeline com cronômetro) — aparece quando chega 1º `step` SSE.
3. `MarkdownBody` + cursor piscando — quando chegam `token`s.

Problemas:
- Salto visual entre fase 1 → 2 → 3 (componentes diferentes, alturas diferentes).
- Fase 1 fica "muda" se o n8n demora para emitir o 1º step.
- Texto fixo "3 a 8 segundos" é uma promessa que não conseguimos cumprir.
- Cursor de streaming some quando o último token chega antes do `[DONE]`, dando sensação de travado.
- Não há "skeleton" para o conteúdo enquanto os steps já terminaram mas o token ainda não começou.

## Plano

### 1. Remover a promessa de tempo (`ChatMessage.tsx`)

- Apagar a linha `Costuma levar de 3 a 8 segundos.` em `AgentThinking`.
- Manter apenas a frase rotativa + dots + (se `softTimeout`) o aviso amarelo "está demorando mais que o normal".

### 2. Feedback imediato no envio (`useChatMessages.ts` — legacy SSE)

Hoje, ao despachar `sendMessageLegacy`, criamos a mensagem com `steps: []`. O `AgentThinking` aparece até o 1º evento SSE chegar (pode levar 1-2s só de handshake). Vamos:

- Pré-popular `steps: ['Conectando ao agente…']` na criação otimista do assistant.
- Quando chegar o 1º `step` real do servidor, **substituir** esse step inicial (não acumular) — detectar pelo índice 0 sendo o placeholder.
- Resultado: usuário vê a `AgentSteps` timeline imediatamente, sem o "salto" do AgentThinking.

Com isso, `AgentThinking` praticamente some do fluxo legacy. Mantemos o componente para o modo async (que não emite steps).

### 3. Skeleton shimmer entre "último step" e "primeiro token" (`AgentSteps.tsx` / `ChatMessage.tsx`)

Quando todos os steps chegaram mas `content` ainda está vazio, hoje o usuário vê apenas a timeline parada. Vamos:

- Em `ChatMessage.renderContent`, quando `showSteps && !hasContent && isInFlight`, renderizar abaixo da timeline um bloco shimmer com 2-3 linhas falsas (`<div class="h-3 bg-muted/30 rounded animate-pulse">`) larguras variando (90%, 70%, 50%).
- Isso preenche o gap visual e sinaliza "resposta sendo escrita".

### 4. Transição suave steps → conteúdo

- Quando `hasContent` passa a `true`, a timeline `AgentSteps` colapsa para uma linha resumo: `✓ Concluído em Xs · N etapas` (clicável para expandir o detalhe). Implementar em `AgentSteps` aceitando prop `collapsed?: boolean` controlado pelo `ChatMessage` (`collapsed = hasContent`).
- Skeleton da etapa 3 desaparece (fade-out 200ms) quando o 1º token entra.

### 5. Cursor de streaming mais sólido

Em `ChatMessage.tsx`:
- Trocar `<span class="w-0.5 h-4 bg-primary animate-pulse">` por um cursor que aparece **inline ao final da última linha de texto** com classe nova `streaming-caret` (CSS: 2px, blink 1s steady, mesma cor primary).
- Garantir que o cursor só some quando `status === 'complete'` (não quando os tokens param momentaneamente).

### 6. Modo async (fallback) — `sendMessageAsync`

No async não temos steps SSE. Para não cair de volta no `AgentThinking` "vazio":
- Pré-popular `steps: ['Enfileirando consulta…', 'Aguardando agente…']` de forma escalonada (segundo step entra após 1.5s via `setTimeout`).
- Quando o status muda para `complete`, AgentSteps colapsa normalmente.

### 7. CSS (`index.css`)

- Adicionar `.streaming-caret` (cursor sólido com blink suave).
- Adicionar `.chat-skeleton-line` (shimmer gradient horizontal, mesmo padrão dos cards).
- Animação `agent-collapse` para a timeline encolher.

## Arquivos afetados

- `src/components/chat/ChatMessage.tsx` — remove texto, adiciona skeleton, novo cursor, controla `collapsed`.
- `src/components/chat/AgentSteps.tsx` — aceita `collapsed`, renderiza modo resumo.
- `src/hooks/useChatMessages.ts` — pré-popula steps no envio (legacy + async), reconcilia 1º step real.
- `src/index.css` — `.streaming-caret`, `.chat-skeleton-line`, animação de colapso.

## O que NÃO muda

- Contrato SSE com `nlq-proxy` (eventos `step`, `token`, `done`).
- Lógica de recovery polling, soft/hard timeouts, phantom suppression.
- Backend / edge functions.
