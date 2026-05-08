# Plano: Refinar navegação e Chat no mobile

## Diagnóstico (viewport 390px)

1. **Headers empilhados no /chat**: `MobileTopBar` (h-12) + Header do Chat (h-12) = 96px de cabeçalho fixo, sobrando pouco espaço útil.
2. **Duas sidebars + dois triggers diferentes**: o `MobileTopBar` abre a `AppSidebar` (navegação Home/Chat/Financeiro/Pedidos) e o botão `<PanelLeft>` no header do chat abre a `SessionsSidebar` (lista de conversas). No mobile o usuário não distingue qual é qual e o botão de navegação some quando o chat assume o topo (na verdade, hoje **só temos o trigger das conversas** no /chat — o trigger da navegação principal sumiu).
3. **SessionsSidebar de 280px** em tela de 390px ocupa 71% — funciona, mas pode ir melhor com `min(85vw, 320px)` e melhor backdrop.
4. **Header do Chat**: badge "Conectado", logo bot, "Assistente NBL", "/", título da sessão — tudo na mesma linha em 390px causa truncamento agressivo do título.
5. **Composer mobile**: padding `py-3` + textarea `minHeight: 52px` + barra inferior `py-2` = quase 100px só no composer. Pode ser mais compacto.
6. **Empty state do chat** (`ChatEmptyState`): cartões `QUICK_MODELS` em `grid-cols-1` no mobile ficam grandes; chips de sugestão dispostos em centro com wrap — funciona mas o padding `py-12` empurra tudo pra baixo.

## Solução

### A) Header unificado no Chat mobile
- No mobile, o header do `/chat` ganha **dois triggers**: um para abrir a `AppSidebar` (navegação principal — Home/Financeiro/Pedidos) e outro para abrir as conversas. Não duplica `MobileTopBar`.
- `MobileTopBar` continua existindo para as outras rotas, mas **não renderiza em /chat** (já tem sua própria barra).
- Layout do header /chat no mobile (390px):
  ```
  [☰ menu] [💬 conversas] | Título da sessão (truncado)        [•dot]
  ```
  - Esconder "Assistente NBL / " no mobile (mostra só em sm+).
  - Status badge vira **bolinha colorida** (3px) sem texto em mobile.

### B) SessionsSidebar mobile
- Largura: `w-[min(85vw,320px)]` em vez de `280px` fixo (melhor em telas 320–414px).
- Backdrop com `bg-black/60 backdrop-blur-sm` (mais bloqueador, fecha mais óbvio).
- Botão "Nova conversa" sem o `kbd ⌘⇧O` no mobile (atalho irrelevante) — mais espaço pro texto.
- Ao tocar uma conversa no mobile, **fechar a sidebar automaticamente** (`onModeChange('hidden')` após `onSelectSession`).
- Header da sidebar: o botão "Recolher" no mobile vira "✕ fechar" (ícone X mais óbvio que o `PanelLeftClose`).

### C) Composer mobile mais compacto
- `px-3 py-2` (era `py-3`).
- `minHeight: 44px` (era 52px) — ainda confortável pra toque.
- Barra inferior do composer: esconder o texto "Shift+Enter para nova linha" em <sm (não há keyboard).
- Disclaimer "O assistente pode cometer erros" → texto menor `text-[9px]`, menos margem `mt-1`.

### D) ChatEmptyState mobile
- Reduzir `py-12` → `py-6 sm:py-12`.
- Header (sparkles + título): manter.
- `QUICK_MODELS`: já é `grid-cols-1 sm:grid-cols-3` — manter, mas reduzir padding interno dos cards (`p-3 sm:p-4`).
- Suggestion chips: aumentar tap target (`py-1.5` → `py-2 sm:py-1.5`).

### E) AppSidebar (navegação) no mobile
- Verificar que ao abrir via `SidebarTrigger`, o sheet renderiza confortavelmente (já é `Sheet` shadcn = OK por padrão, com `w-[--sidebar-width]`).
- Garantir que o footer (Toggle tema + Sair) está acessível ao final do sheet.

## Arquivos a modificar

1. **`src/components/layout/MobileTopBar.tsx`** — não renderizar em `/chat` (return null se path começa com `/chat`).
2. **`src/pages/Chat.tsx`** — header reorganizado:
   - Adicionar `<SidebarTrigger>` (do AppSidebar/shadcn) à esquerda do trigger de conversas.
   - Esconder "Assistente NBL /" em <sm.
   - StatusBadge → bolinha simples em <sm.
   - Composer: padding/minHeight reduzidos no mobile, esconder hints irrelevantes.
3. **`src/components/chat/SessionsSidebar.tsx`**:
   - Largura `w-[min(85vw,320px)] md:w-[280px]`.
   - Backdrop reforçado.
   - Esconder kbd no botão "Nova conversa" em <sm.
   - Adicionar prop `onSelectAndClose` (ou wrap em handler) para fechar sidebar no mobile ao selecionar.
   - Ícone X em mobile no botão fechar.
4. **`src/components/chat/ChatEmptyState.tsx`** — paddings/tap targets responsivos.

## Aspecto técnico
- Sem mudanças em hooks, dados ou contratos.
- Sem novas dependências.
- Usa `useIsMobile()` quando precisar de JS; preferência por classes Tailwind responsivas.
- `SidebarTrigger` shadcn (já importado em `MobileTopBar`) será reusado no header do Chat mobile.

## Resultado esperado
- Em 390px: cabeçalho do chat com **um único nível** (h-12), navegação app + conversas acessíveis via dois ícones claros, título da sessão legível, mais espaço pra mensagens.
- Composer mais compacto = mais conteúdo visível.
- Sidebar de conversas adapta largura à tela e fecha sozinha ao escolher conversa.

## Fora do escopo
- Bottom navigation (tab bar) — explorar em iteração futura se necessário.
- Gestos swipe-to-open.
