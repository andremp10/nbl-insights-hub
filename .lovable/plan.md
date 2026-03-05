

# Plano de Melhorias — Transicoes, Chat, Home e UX Global

---

## 1. Transicoes entre paginas (tela branca no lazy load)

**Problema:** O `Suspense` com `lazy()` mostra um `PageLoader` (spinner tela cheia com fundo `bg-background`) a cada troca de rota. Isso causa um flash branco/escuro entre paginas.

**Correcao:**
- Remover o `Suspense` global que envolve todas as rotas.
- Adicionar `framer-motion` page transitions: envolver cada pagina com um `motion.div` que faz fade-in/fade-out rapido (150ms).
- Criar um componente `PageTransition` que aplica `AnimatePresence` + `motion.div` com `opacity` e leve `translateY`.
- Manter `lazy()` mas trocar o fallback do Suspense de spinner tela cheia para um skeleton minimo inline (ou nenhum, ja que as paginas sao leves).
- Em `App.tsx`: envolver o conteudo de cada `Route` com `<PageTransition>`.

**Arquivos:** `src/App.tsx`, novo `src/components/layout/PageTransition.tsx`

---

## 2. Chat — Typewriter so na mensagem nova + formatacao

**Problema:** O `useTypewriter` roda em TODAS as mensagens do assistente que sao marcadas como "novas" (nao estavam no `initialMsgIdsRef`). Se o usuario troca de sessao e volta, mensagens ja vistas sao re-animadas. Alem disso, o `ReactMarkdown` com `key={displayedText.length}` causa remontagem constante, quebrando a renderizacao de tabelas durante a digitacao.

**Correcoes:**
- **Typewriter apenas na ultima mensagem do assistente que acabou de chegar.** Adicionar um ref `lastAnimatedIdRef` que guarda o ID da ultima mensagem animada. So animar se `message.id` for diferente do ultimo animado E for a ultima mensagem do array.
- **Remover o `key` dinamico do ReactMarkdown.** Usar `key="static"` sempre — o componente ja re-renderiza quando `contentToRender` muda.
- **Velocidade mais rapida:** mudar speed de 12ms para 8ms e chunk maximo de 3 para 5 chars para texto longo parecer mais fluido.
- **Marcar mensagem como "ja animada" apos conclusao** para evitar re-animacao ao trocar de sessao.

**Arquivos:** `src/pages/Chat.tsx`, `src/components/chat/ChatMessage.tsx`, `src/hooks/useTypewriter.ts`

---

## 3. Sugestoes do Chat — conteudo relevante + UX fluida

**Problema:** As sugestoes sao genericas e a experiencia de clique nao e fluida (o texto vai para o input mas nao envia automaticamente).

**Correcoes:**
- **Sugestoes mais uteis e especificas para grafica:**
  1. "Qual o faturamento deste mes?"
  2. "Top 10 clientes por valor de pedidos"
  3. "Pedidos em producao agora"
  4. "Comparar receita vs despesas do mes"
  5. "Quais categorias de despesa mais cresceram?"
  6. "Pedidos com pagamento pendente"
- **Ao clicar uma sugestao, enviar diretamente** (nao apenas preencher o input). Mudar o callback `onSuggestionClick` no `ChatEmptyState` para chamar `handleSend` diretamente.
- **Remover o `ChatSuggestionsPanel` lateral** (painel de sugestoes a direita) que nao esta sendo usado na pagina do Chat e e redundante com o EmptyState.

**Arquivos:** `src/components/chat/ChatEmptyState.tsx`, `src/pages/Chat.tsx`

---

## 4. Home Page — redesenho visual impressionante

**Problema:** A Home atual e funcional mas generica. Precisa impressionar como "porta de entrada" do sistema.

**Redesenho:**
- **Hero section grande** com saudacao + subtitulo elegante ("Plataforma de gestao inteligente da NBL Grafica").
- **Barra de busca centralizada** com design premium (glassmorphism sutil, borda com glow laranja no focus).
- **3 cards de modulo** (Chat IA, Financeiro, Pedidos) com icones grandes, gradientes sutis e descricao clara. Cada um com hover animado (scale + border glow).
- **KPIs em linha** abaixo dos cards com animacao de contagem (countUp) nos numeros.
- **Remover as sugestoes de texto** da Home (elas vivem no Chat). Substituir por um CTA "Pergunte ao assistente" que navega ao chat.
- **Animacoes escalonadas** usando framer-motion stagger para entrada dos elementos.

**Arquivo:** `src/pages/Home.tsx` (reescrever)

---

## 5. Transicao Login → App

**Problema:** Apos login, a transicao e abrupta (redirect sem animacao).

**Correcao:**
- No `Auth.tsx`, apos login bem-sucedido, adicionar um fade-out antes do redirect.
- O `PageTransition` criado no item 1 ja vai suavizar a entrada da primeira pagina protegida.
- Adicionar `animate-fade-in` na `AppLayout` para que o layout inteiro faca fade-in na montagem inicial.

**Arquivos:** `src/pages/Auth.tsx`, `src/components/layout/AppLayout.tsx`

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/layout/PageTransition.tsx` | Novo componente de transicao entre paginas |
| `src/App.tsx` | Integrar PageTransition, ajustar Suspense |
| `src/pages/Chat.tsx` | Typewriter so na ultima msg, sugestao envia direto |
| `src/components/chat/ChatMessage.tsx` | Remover key dinamico, ajustar animate |
| `src/hooks/useTypewriter.ts` | Aumentar velocidade, chunk maior |
| `src/components/chat/ChatEmptyState.tsx` | Sugestoes mais relevantes, envio direto |
| `src/pages/Home.tsx` | Redesenho visual completo |
| `src/pages/Auth.tsx` | Fade-out pos-login |
| `src/components/layout/AppLayout.tsx` | Fade-in na montagem |

