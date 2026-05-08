# Plano: Sidebar de Sessões + Navegação do Chat

## Diagnóstico crítico do que está ruim hoje

1. **Sem busca**: com 20+ conversas, não há como encontrar nada — só rolar.
2. **Sem atalhos**: navegar entre conversas exige mouse para tudo (não há ⌘K, setas, ⌘N).
3. **Botão "Nova conversa" duplicado e fraco**: aparece dentro da sidebar (tracejado, cinza, "secundário") e também no header do chat — visualmente confuso e nenhum dos dois é destacado.
4. **Toggle externo estranho**: o botão de fechar/abrir sidebar fica numa coluna `w-8` à direita do painel, criando uma faixa cinza vazia desperdiçando 32px na vertical inteira. Quebra o alinhamento com o header do chat.
5. **Sidebar usa hack de `marginRight: -260px`**: ao colapsar, ela some por completo. Não há um modo "icon rail" — perde-se contexto.
6. **Item ativo discreto**: borda lateral 2px laranja + bg muito leve. Em scroll é fácil perder onde está.
7. **Sem informação útil por conversa**: só mostra título. Falta horário/data relativa, contagem de mensagens, ou preview da última pergunta. Tudo parece igual.
8. **Sem fixar (pin)** conversas importantes — somem na ordenação por `last_message_at`.
9. **Renomear via duplo-clique**: descoberta zero. Usuário não sabe que existe.
10. **Confirmação de exclusão inline** quebra o layout do item (tamanho diferente, parece bug).
11. **Estado vazio fraco**: "Nenhuma conversa ainda" — não convida nem orienta.
12. **Mobile**: backdrop existe, mas o swipe-to-close está ausente; toggle externo some.
13. **Acessibilidade**: sem `aria-current`, sem foco visível claro, ESC fecha mas não há trap de foco.

## Princípios de design da nova sidebar

- **Densa e profissional** (consistente com B2B terminal aesthetic já registrado em memória).
- **Sempre presente**: dois modos — `expanded` (260px) ou `rail` (52px com ícones), nunca totalmente oculta no desktop. Mobile mantém overlay.
- **Hierarquia clara**: ações primárias em laranja, secundárias em cinza; item ativo com fundo laranja sólido suave + barra à esquerda animada.
- **Buscável e navegável por teclado**.

## Estrutura do novo painel (expanded, 260px)

```text
┌─────────────────────────────────────┐
│ ▣ Conversas              ⌘K  «     │  ← header com toggle
├─────────────────────────────────────┤
│ [+ Nova conversa]                   │  ← botão sólido laranja, full-width
├─────────────────────────────────────┤
│ 🔍 Buscar conversas…    ⌘F          │  ← input com filtro client-side
├─────────────────────────────────────┤
│ FIXADAS                             │  ← grupo opcional (se houver pins)
│ ▸ ★ Análise Q1 2026          14:22  │
│                                      │
│ HOJE                                │
│ ▸ ● Faturamento de janeiro    09:15 │  ← ativo: bg-primary/12, ●laranja
│ ▸   Top clientes último mês   08:40 │
│                                      │
│ ONTEM                                │
│ ▸   Despesas por categoria   18:02  │
│                                      │
│ ESTA SEMANA · 4                     │  ← grupo colapsável
│ ▸   …                                │
└─────────────────────────────────────┘
│ user@nbl.com           ⚙             │  ← footer (opcional, fora do escopo)
```

## Estrutura do novo painel (rail, 52px)

```text
┌────┐
│ ▣  │  toggle expand
│ +  │  nova conversa (laranja)
│ 🔍 │  abre busca em popover
├────┤
│ ●  │  conversa ativa (dot laranja + tooltip com título)
│ ○  │  conversas recentes (até 8 últimas, dot cinza)
│ ○  │
│ …  │  "ver todas" → expande
└────┘
```

Hover em qualquer dot mostra **tooltip** com título completo + horário.

## Funcionalidades novas

### F1. Busca client-side (instant filter)
Input no topo da lista. Filtra `sessions` por `title.toLowerCase().includes(query)`. Highlight do match no texto. Atalho `⌘F` / `Ctrl+F` quando sidebar está focada (sem capturar global). Esc limpa.

### F2. Atalhos de teclado globais (no /chat)
- `⌘K` (Cmd/Ctrl+K): foca o campo de busca da sidebar
- `⌘⇧O` (Cmd/Ctrl+Shift+O): nova conversa
- `⌘B` (Cmd/Ctrl+B): toggle sidebar (expand ↔ rail)
- `Alt+↑` / `Alt+↓`: navegar conversa anterior/próxima na lista visível
- `Esc` (apenas em rename/search/confirm): cancela
- Indicador visual dos atalhos com `<kbd>` no header

### F3. Pin/Fixar conversa
Botão estrela no hover. Salvo em `localStorage` (`nbl_pinned_sessions: string[]`) — sem migração de DB. Conversas fixadas vão para grupo "FIXADAS" no topo, com ícone ★ laranja. Clique novamente para desfixar. (Alternativa: criar coluna `is_pinned` via migração — incluo como opcional na seção técnica.)

### F4. Item de conversa redesenhado
```text
[●] Faturamento de janeiro              14:22
    sobre janeiro completo                ⋯
```
- Linha 1: indicador de status (●ativo laranja sólido / ○inativo) + título truncado (1 linha) + horário relativo direita
- Linha 2 (opcional, só no item ativo OU hover): preview do último user message (cinza, 1 linha) — exige consultar `chat_messages` por sessão. **Para não custar request extra**, faço lazy: ao montar a sidebar disparo um único `select session_id, content` agrupado pelas top 50 sessões. Cacheado 2min.
- Direita: menu kebab `⋯` no hover → Renomear / Fixar / Exportar / Excluir (DropdownMenu shadcn em vez de duas iconezinhos perdidos)

### F5. Item ativo enfático
- `bg-primary/12` (laranja translúcido)
- Barra esquerda 3px sólida `bg-primary` com cap arredondado, animada (slide-in)
- Texto `text-foreground` em vez de cinza
- `aria-current="page"`

### F6. Confirmação de exclusão em modal (não inline)
Usar `AlertDialog` shadcn. Item da lista não muda de tamanho. Mostra título da conversa para evitar engano.

### F7. Renomear inline acessível
- Adicionar opção **explícita** "Renomear" no menu kebab (descoberta).
- Manter duplo-clique como atalho.
- Input herda exatamente o mesmo tamanho/padding do item (nada de pular layout).

### F8. Grupos colapsáveis
"Hoje" e "Ontem" sempre abertos. "Esta semana" e "Mais antigas" colapsam (`Collapsible` shadcn) e mostram contagem (`ESTA SEMANA · 4`). Estado salvo em `localStorage`.

### F9. Estado vazio convidativo
Em vez de "Nenhuma conversa ainda":
```text
   💬
   Comece sua primeira conversa
   [+ Nova conversa]   ou pressione ⌘⇧O
```

### F10. Toggle integrado
Remover a coluna externa `w-8`. O toggle vira:
- No modo expanded: ícone `«` no canto superior direito do header da sidebar (já existe, mas removo a coluna externa).
- No modo rail: o próprio header do rail tem o ícone `»` para expandir.

## Mudanças no Chat.tsx (header)

- Remover botão "Nova conversa" do header (já está proeminente na sidebar) **OU** transformar em ícone discreto que reaproveita atalho.
- Decisão: **manter** mas como ícone simples, sem duplicar a hierarquia.
- Adicionar breadcrumb leve no header: `Assistente NBL · {título da conversa atual}` (truncado), o que ajuda a saber onde está quando a sidebar está em rail.

## Arquivos a modificar/criar

1. **`src/components/chat/SessionsSidebar.tsx`** — reescrita completa.
2. **`src/components/chat/SessionItem.tsx`** *(novo)* — item de conversa isolado (item ativo, hover, kebab menu, rename inline).
3. **`src/components/chat/SessionsSearch.tsx`** *(novo)* — input de busca com atalho.
4. **`src/components/chat/DeleteSessionDialog.tsx`** *(novo)* — AlertDialog de confirmação.
5. **`src/hooks/useChatSessions.ts`** — adicionar:
   - `togglePinSession(id)` (localStorage)
   - retornar `pinnedIds: Set<string>` e re-agrupar com "Fixadas" no topo
   - `lastPreviews: Record<sessionId, string>` (lazy fetch único agrupado)
6. **`src/hooks/useChatShortcuts.ts`** *(novo)* — registra os atalhos `⌘K`, `⌘B`, `⌘⇧O`, `Alt+↑/↓`.
7. **`src/pages/Chat.tsx`** — usar novo modo `sidebarMode: 'expanded' | 'rail'`, ligar atalhos, ajustar header (breadcrumb, remover botão duplicado), passar `mode` à sidebar.
8. **`src/index.css`** — adicionar utilitário `.session-active-bar` (animação slide-in da barra esquerda) e estilo do `<kbd>` chip.

## Aspecto técnico

- **Sem nova dependência**: tudo com componentes shadcn já presentes (`AlertDialog`, `DropdownMenu`, `Collapsible`, `Tooltip`, `Input`).
- **Sem migração de DB obrigatória** (pin via localStorage). Se o usuário quiser persistência cross-device futuro, podemos adicionar `is_pinned boolean default false` em `chat_sessions` numa segunda etapa.
- **Performance**: `useMemo` para o `groupedSessions` filtrado; busca debounced 80ms; lista virtualizada **não necessária** até ~200 conversas (manter simples).
- **Acessibilidade**: `aria-current="page"` no ativo, `role="navigation"`, focus ring visível no item, `aria-keyshortcuts` no botão de busca, ESC fecha popover/rename, foco move-se para item ativo após troca.
- **Consistência visual**: cores HSL via tokens (`--primary`, `--muted`, `--border`, `--card`), nada hardcoded — respeita dark/light.
- **Mobile**: rail não aplica (<768px) — mantém overlay full-screen com swipe-close (`onTouchStart/End` simples) + backdrop.

## O que NÃO vou fazer agora (escopo definido)

- Persistência de pin no DB (fica em localStorage, suficiente).
- Exportar conversa (pode entrar numa segunda iteração).
- Drag-and-drop para reordenar pins.
- Compartilhamento de conversa.

## Resultado esperado

A navegação passa a ter: **busca instantânea**, **atalhos de teclado**, **pin de favoritas**, **item ativo claramente visível**, **rail mode preservando contexto**, **menu kebab descoberto** e **breadcrumb no header**. A sidebar deixa de ser uma lista crua e vira um painel de navegação digno de produto B2B premium.
