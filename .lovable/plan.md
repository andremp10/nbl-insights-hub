## Diagnóstico — onde estão os gargalos

Analisei `App.tsx`, `useChatMessages`, `useChatSessions`, `Chat.tsx`, `ChatMessage`, `Pedidos`, `Financeiro`, `Home`, `AppSidebar`, `AuthContext`, `index.css`, `DotMapCanvas` e `package.json`.

Os gargalos reais que travam a UI são quatro, em ordem de impacto:

### 1) Bundle inicial pesado carregado de uma vez (TTI alto)
- `App.tsx` faz `lazy()` das páginas, mas o **chunk inicial ainda inclui** tudo o que `App` importa estático: `framer-motion` (LoadingBar), `@tanstack/react-query`, `Toaster`, `Sonner`, `Tooltip`, `Sidebar`, `ThemeProvider`, `AppLayout`, `AppSidebar`, `ProtectedRoute`, `AuthContext`, `DateFilterContext`, todos os `Skeletons`.
- `react-markdown` + `remark-gfm` + `recharts` + `react-day-picker` + `embla-carousel-react` + `vaul` estão no `package.json` e podem ser puxados sem necessidade no boot.
- Resultado: TTI grande, sensação de “travado” logo no carregamento.

### 2) Re-render em rajada no streaming do chat
- Em `useChatMessages.sendMessage`, cada token do SSE chama `setMessages(prev => prev.map(...))` — isso é **um re-render por caractere** durante a stream.
- `ChatMessage` re-renderiza inteiro a cada token: `ReactMarkdown` reprocessa o markdown completo e tabelas inteiras a cada chunk. Em respostas longas com tabelas é o que causa “congelamento” perceptível.
- `Chat.tsx` também faz `useEffect` de auto-scroll dependendo de `lastMsgContent` → dispara `scrollIntoView({behavior:'smooth'})` por token.

### 3) Auth bloqueia o boot
- `AuthProvider` só seta `loading=false` depois de `getSession()` + `fetchAppUser()` em série. Enquanto isso, `ProtectedRoute` renderiza skeleton/splash.
- `app_users` é consultado a cada montagem; sem cache em memória (refresh recarrega tudo).
- Em conexões lentas isso aparece como “tela parada”.

### 4) Listas/transformações sem memo + queries gordas
- `usePedidosData` busca até **1000 linhas** em `vw_dashboard_pedidos` e os hooks `usePedidosKPIs / useStatusDistribuicao / useTopClientes / usePedidosPaginados` recalculam reduce/sort/filter a cada render do consumidor (não estão `useMemo`).
- `useChatSessions.groupedSessions` cria 4 `Date` novos por execução (ok), mas a sort no UPDATE handler re-sorta o array inteiro a cada UPDATE realtime.
- `DotMapCanvas` (auth) anima 60fps mesmo com aba fora de foco e cores hardcoded fora do design system.

### 5) Detalhes que somam
- Fonte Google `Inter` carregada via `@import` no CSS = render-blocking no primeiro paint. Deveria ir como `<link rel="preconnect"+stylesheet>` no `index.html`.
- `LoadingBar` usa `useIsFetching` global → re-renderiza root a cada query nova/concluída e usa `framer-motion` (overkill para uma barra; CSS já basta).
- `AppLayout` envolve tudo em `SidebarProvider` que injeta context + measurements; não é problema sozinho mas combinado com framer-motion puxa.

---

## Plano de correção

### A) Reduzir o bundle inicial e o caminho crítico
1. Remover `framer-motion` do caminho crítico:
   - Substituir `LoadingBar` por implementação CSS pura (já há `chat-shimmer-bar`/`pageFadeIn` no `index.css`). Manter o mesmo visual.
   - Remover `framer-motion` do `App` e dos componentes que usam apenas fade simples (`DashboardLayout`).
2. Lazy real das libs caras de chat:
   - `react-markdown` + `remark-gfm` só carregam dentro de `ChatMessage` quando o usuário entra em `/chat` (já é lazy via `Chat` page) — garantir que não há import estático em outro lugar (ok).
3. Mover Google Fonts do `@import` CSS para `<link>` no `index.html` com `preconnect` e `display=swap` (não-bloqueante).
4. Code-split do `CreateUserModal` no `AppSidebar` (só master usa) via `lazy()` + abrir sob clique.
5. Pré-fetch das rotas no hover dos itens da sidebar (`import('./pages/Pedidos')`) para tornar transições instantâneas sem aumentar bundle inicial.

### B) Streaming do chat sem travar
1. Em `useChatMessages.sendMessage`, **acumular tokens em ref** (`accumulatedRef.current += parsed.token`) e fazer flush para o estado via `requestAnimationFrame` agendado (no máximo 1 update por frame, ~16ms). Padrão clássico para streams.
2. Memoizar parsing do markdown:
   - `ChatMessage` já é `memo`, mas o `normalizeMarkdown(message.content)` roda toda renderização. Envolver em `useMemo` por `content`.
   - Extrair o bloco `ReactMarkdown` em subcomponente `MarkdownBody` memoizado por `content`.
3. Remover `behavior:'smooth'` do auto-scroll durante `isStreaming` (usar `auto`); manter smooth só na 1ª aparição da mensagem. Evita reflow contínuo.
4. Limitar o auto-scroll a uma vez por animation frame.

### C) Auth não bloqueante
1. No `AuthProvider`, renderizar a árvore assim que `session` é conhecida; carregar `appUser` em paralelo e expor `appUserLoading` separado.
2. Cachear o resultado de `app_users` em `sessionStorage` por `auth_user_id` para evitar round-trip a cada refresh; revalidar em background.
3. `ProtectedRoute` mostra skeleton só enquanto `session === undefined`; se houver `session` mas `appUser` ainda carregando, libera UI e exibe estado leve.

### D) Hooks de dados mais leves
1. Adicionar `useMemo` em `usePedidosKPIs / useStatusDistribuicao / useTopClientes` para que o trabalho só rode quando `items` mudar (hoje recalcula por render do consumidor).
2. Reduzir o `limit(1000)` de `usePedidosData` para o tamanho real necessário (ex.: 500) e considerar `select` apenas das colunas usadas (não `*`).
3. Em `useChatSessions`, transformar a lista em mapa indexado por id para INSERT/UPDATE/DELETE em O(1); manter sort estável.

### E) Polimentos finais
1. `DotMapCanvas`: pausar `requestAnimationFrame` quando `document.hidden` (evento `visibilitychange`) e quando o componente sai do viewport.
2. `LoadingBar`: trocar por `<div>` CSS puro com `animation` infinita controlada por `data-loading="true"` no body; remover dependência de framer-motion + re-render por fetch.
3. `index.css`: remover `@import` de fonte; mover para `index.html`.

---

## Detalhes técnicos

Arquivos que vão mudar:

```text
src/App.tsx                              — remover framer-motion, simplificar LoadingBar
src/components/layout/LoadingBar.tsx     — CSS-only, sem framer-motion
src/components/layout/DashboardLayout.tsx— remover motion (ou trocar por CSS class)
src/contexts/AuthContext.tsx             — appUser não bloqueante + cache sessionStorage
src/components/auth/ProtectedRoute.tsx   — desbloquear quando session existir
src/hooks/useChatMessages.ts             — flush de tokens via rAF (ref + agendamento)
src/components/chat/ChatMessage.tsx      — memo do markdown + extrair MarkdownBody
src/pages/Chat.tsx                       — auto-scroll 'auto' durante streaming + rAF guard
src/hooks/usePedidos.ts                  — useMemo nos derivados, select específico
src/hooks/useChatSessions.ts             — sort estável + handler eficiente
src/components/auth/DotMapCanvas.tsx     — pausar quando hidden
src/components/layout/AppSidebar.tsx     — lazy CreateUserModal
src/index.css                            — remover @import Inter
index.html                                — preconnect + link Inter
```

Nada de mudança de design; apenas performance e arquitetura de carregamento. Sem novas dependências.

## Resultado esperado

- Boot inicial mais leve: menos JS no chunk principal, fonte não-bloqueante, auth não trava UI.
- Chat responsivo durante streaming: 1 render por frame em vez de 1 por token; sem reflow contínuo.
- Páginas de Pedidos/Financeiro sem recomputar reduce/sort em todo render.
- Sensação geral “destravada”, sem perder funcionalidade ou visual.
