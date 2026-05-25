## Objetivo
Tornar o módulo Chat mais **fluido** (microinterações, latência percebida, foco) e melhor para **pesquisar/analisar** (achar consultas passadas, reutilizar, refinar período, exportar). Sem mexer em lógica de backend, contratos com n8n ou views.

Restrições fixas (memória do projeto):
- Paleta: Charcoal & Ember — `#0d0d0d / #1a1a1a / #2a2a2a / #E8501A` (primary já é `#E8501A`).
- Tipografia: manter as fontes atuais do sistema em toda a aplicação.
- Estética: dense B2B / terminal, dark+light, flat (sem glassmorphism).
- Layout: sidebar clássica (sessões à esquerda, conversa central).

## Escopo (somente front)

### 1. Composer (caixa de mensagem) — mais fluido e poderoso
Arquivo: `src/pages/Chat.tsx` (subcomponente `ChatComposer`).

- **Chips de contexto** acima do textarea: período ativo (Mês atual / 30d / custom) + módulo (Financeiro / Pedidos / Tudo). Clicar abre um popover compacto para alternar. O valor escolhido entra no `context.date_range` / `active_module` do payload n8n.
- **Slash commands** (`/financeiro`, `/pedidos`, `/receita`, `/despesas`) já existem em `CommandPalette.tsx` mas não estão integrados — plugar no composer com navegação ↑↓/Tab/Esc.
- **Stop generation**: quando `sending=true`, o botão de envio vira "Parar" (Square icon) e dispara `clearErrors`/abort do request em curso (apenas UI; abort real fica para outra iteração se exigir backend).
- **Auto-resize suave** com transição CSS (já temos `useAutoResizeTextarea`, podemos reaproveitar) e altura máxima ampliada para 240px com scroll interno discreto.
- **Atalhos visíveis** discretamente no rodapé do composer: `⏎ enviar · ⇧⏎ nova linha · / comandos · ⌘K busca`.

### 2. Sidebar de sessões — pesquisa e organização
Arquivo: `src/components/chat/SessionsSidebar.tsx`.

- **Busca sticky no topo** com contador "X de Y" e realce do termo (`<mark>`) nos títulos.
- **Filtro por período** (Hoje / 7d / 30d / Tudo) em pill row abaixo da busca, opera client-side sobre `groupedSessions`.
- **Hover preview**: ao passar 400ms sobre uma sessão, um popover lateral mostra as últimas 2 perguntas/respostas (pré-carregadas via cache do React Query).
- **Reordenar pinos** por drag-and-drop (dnd-kit; só dentro do grupo "Fixadas"). Persistir ordem em localStorage.
- **Densidade**: ajustar `py` e separadores para reduzir altura ~15%, mais sessões visíveis sem perder legibilidade.

### 3. Empty state — começar a análise mais rápido
Arquivo: `src/components/chat/ChatEmptyState.tsx`.

- Trocar grade estática por três blocos progressivos:
  1. **Continuar de onde parei**: cards das 3 últimas sessões com snippet da última resposta (1 linha).
  2. **Modelos rápidos** (atuais 3) — mantém, mas com chip de "Última atualização" usando o ETL diário.
  3. **Catálogo de perguntas** — sugestões atuais agrupadas por módulo (Financeiro / Pedidos / Clientes) em accordion compacto.
- Barra de busca-de-perguntas no topo do empty state ("Buscar exemplos…") filtra os cards/chips em tempo real.

### 4. Área de mensagens — análise e ação
Arquivo: `src/components/chat/ChatMessage.tsx`.

- **Ações inline na resposta** (mostradas no hover, hoje só "Copiar"):
  - Copiar Markdown · Copiar como texto · Exportar tabela (CSV) quando a resposta contiver `|...|` markdown table · "Refinar" (preenche o composer com a pergunta original + sufixo `…detalhe por mês`).
- **Follow-ups sugeridos**: 3 chips após cada resposta `complete` (placeholders heurísticos a partir do conteúdo — ex.: "Compare com o mês anterior", "Mostrar por categoria", "Top 10 apenas").
- **Pesquisa dentro da conversa** (`Ctrl/⌘+F` capturado dentro do scroll-area): destaca matches e adiciona contador no header.
- **Botão flutuante "Ir para o fim"** quando o usuário rolou para cima durante streaming (substitui o scroll forçado).
- **Cronômetro do thinking** já existe; adicionar shimmer leve no skeleton e fade-in de 120ms quando o conteúdo chega.

### 5. Header da conversa — contexto sempre visível
Mesmo arquivo `Chat.tsx`.

- Mostrar chip de **período ativo** (vindo do `DateFilterContext` global ou do composer chips) ao lado do título.
- Ação **Renomear** inline com duplo clique no título; ação **Exportar conversa** (Markdown .md) no menu kebab.
- Status (`Consultando / Conectado / Erro`) ganha tooltip com latência média da sessão.

### 6. Microinterações e performance percebida
Arquivo global: `src/index.css` (manter tokens, não inventar cores).

- Transições padronizadas em 150ms ease-out (já está na memória, garantir uso consistente).
- `prefers-reduced-motion`: desativa shimmer/animate-pulse pesado.
- Estados focusvisible com `ring-primary/40` em todos os elementos interativos do chat.
- Skeleton inicial do chat quando `messagesLoading` em vez do loader genérico.

## Detalhes técnicos

- Sem novas dependências críticas; usar `@dnd-kit/core` (já está no projeto se presente — checar; senão, usar HTML5 DnD nativo para escopo pequeno).
- Reaproveitar `CommandPalette.tsx` no composer (já implementado).
- Filtros de período/módulo enviados ao n8n via campo `context` já existente no payload (sem mudança de contrato).
- Exportar CSV: parsing local do markdown da última tabela com regex simples — sem chamadas extras.
- Persistência local: `localStorage` para ordem dos pinos, último período/módulo escolhido no composer, modo da sidebar (já existe).

## Arquivos previstos
- `src/pages/Chat.tsx` — composer enriquecido, chips de contexto, header expandido.
- `src/components/chat/SessionsSidebar.tsx` — busca sticky + filtro período + hover preview + DnD pinos.
- `src/components/chat/ChatEmptyState.tsx` — três blocos progressivos com busca.
- `src/components/chat/ChatMessage.tsx` — ações inline, follow-ups, find-in-conversation.
- `src/components/chat/CommandPalette.tsx` — integração efetiva no composer.
- `src/index.css` — refinos de transição e reduced-motion (sem novos tokens de cor).

## Fora de escopo
- Backend, edge functions, contratos com n8n, views Supabase.
- Mudança de tipografia (mantida em todo o sistema).
- Glassmorphism, gradientes pesados, novas paletas.
