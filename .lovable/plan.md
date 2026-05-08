# Plano: Responsividade Mobile do Sistema NBL

## Diagnóstico crítico por tela

### Layout global (`AppLayout` + `AppSidebar`)
- A `AppSidebar` shadcn em `collapsible="icon"` no mobile vira **off-canvas via Sheet** (já é o padrão), mas **não há nenhum trigger visível no mobile**. Hoje o usuário precisa abrir a barra de endereços lateral e não há hambúrguer no topo das telas. Problema crítico: **nenhuma das telas tem header próprio com botão de menu** — só Pedidos/Financeiro têm header com `<DateFilterBar>`, e o sidebar trigger nunca aparece.
- `AppHeader.tsx` existe mas **não está em uso** (App usa `AppLayout` sem header). Está morto no projeto e confunde manutenção.
- `DashboardLayout.tsx` também existe e **não está em uso** (App usa `AppLayout` em todas as rotas). Outro layout morto.

### Home (`/`)
- `max-w-4xl mx-auto px-4 md:px-8` — OK
- Hero `text-2xl md:text-3xl` — OK
- Botões CTA em `flex flex-wrap gap-3` — funcional, mas no mobile ficam empilhados de forma irregular; precisam ocupar full-width.
- KPIs em `grid grid-cols-3` (sempre 3 colunas, mesmo mobile) — **quebram no mobile**: rótulo "Pedidos em aberto" + valor não cabem em ~110px de largura. Precisa virar `grid-cols-1 sm:grid-cols-3` ou layout horizontal.
- Atividade recente: cada linha tem avatar + nome + badge + valor. No mobile <360px, valor + badge somem na direita. Precisa wrap.
- **Sem botão de menu visível** — usuário não sabe como navegar.

### Chat (`/chat`)
- Sidebar agora tem modo `hidden` no mobile (já feito). Precisa apenas de **trigger no header** mais visível.
- Composer `px-3 py-3 sm:px-4 md:px-6` — OK
- Header do chat com breadcrumb truncado — OK; precisa esconder badge "Conectado" em <380px para ganhar espaço, ou movê-la para baixo.

### Financeiro / Pedidos
- Header `flex items-center justify-between px-6 md:px-8` com **`<DateFilterBar>` à direita** — no mobile, a `DateFilterBar` tem 5 chips + botão "Datas" que não cabem. Precisa virar **scroll horizontal** ou colapsar em popover.
- Padding `p-6 md:p-8` — desperdiça espaço no mobile (24px de cada lado). Reduzir para `p-3 sm:p-6`.
- KPIs `grid md:grid-cols-3/4` — no mobile vira 1 coluna (OK), mas ocupa muito altura. Melhor `grid-cols-2 md:grid-cols-3/4` no Financeiro/Pedidos.
- Charts `grid md:grid-cols-2` — vira 1 coluna no mobile (OK), mas a `HorizontalBarChart` tem `width={150}` no YAxis com nomes de clientes longos — fica apertado no mobile (~360px de tela menos padding). Reduzir width dinamicamente.
- DonutChart legenda em `horizontal` com fontSize 10 — pode quebrar em muitas categorias.
- OrdersTable já tem versão mobile (`md:hidden`) — OK, mas "Filtrar por status" tem `w-[180px]` fixo, quebra layout em telas estreitas. Tornar `w-full sm:w-[180px]`.

### Modais (`ClienteDetailModal`, `PedidoDetailModal`, `CreateUserModal`)
- Não verifiquei conteúdo, mas dialogs shadcn por padrão são `max-w-lg`. Em mobile precisam ser `max-w-[calc(100vw-2rem)]` para não cortar.

### Auth
- `Auth.tsx` tem 10 linhas (delega para componente). Verificar se o canvas decorativo não quebra layout em mobile (provavelmente OK pois usa `auth-grid-bg`).

## Princípios da adaptação

1. **Mobile-first nos paddings**: `p-3 sm:p-6 md:p-8`, `px-4 md:px-6` — reduzir padding em <640px sem perder respiro em desktop.
2. **Grids adaptativos**: nunca forçar `grid-cols-3/4` sem breakpoint; sempre começar `grid-cols-1` ou `grid-cols-2` e expandir em `sm:`/`md:`.
3. **Header consistente em todas as rotas**: criar `MobileTopBar` que aparece **só em <md** com hambúrguer + título da rota + ações. No desktop, mantém os headers atuais por página.
4. **DateFilterBar mobile-friendly**: virar **popover compacto** no mobile (botão "Período" abre painel com presets em coluna).
5. **Touch targets ≥ 40px**: revisar botões `h-7`, `p-1` em ações principais; manter ações secundárias pequenas.
6. **Tabelas e charts não rolam horizontalmente** no mobile (OrdersTable já usa cards — bom modelo); aplicar para qualquer outra tabela.
7. **Tipografia escalável**: `text-2xl md:text-3xl` para headings, `text-sm` mantido para body.
8. **Limpeza**: remover `AppHeader.tsx` e `DashboardLayout.tsx` mortos para reduzir confusão.

## Arquivos a modificar/criar

### Novo: `src/components/layout/MobileTopBar.tsx`
Header fixo `<md` que aparece em **todas as rotas protegidas** (exceto /chat que tem o seu próprio). Contém:
- Hambúrguer (`<SidebarTrigger>` shadcn) à esquerda
- Logo + nome compacto ao centro
- Toggle de tema à direita

Renderizado dentro de `AppLayout` antes do `<main>`, condicional `md:hidden`.

### `src/components/layout/AppLayout.tsx`
- Adicionar `<MobileTopBar />` antes de `<main>` (oculto em md+).
- `<main>` ganha `pt-12 md:pt-0` para compensar o topbar fixo no mobile.

### `src/components/layout/DateFilterBar.tsx` — versão mobile compacta
- Em telas pequenas: esconder os chips de preset, mostrar apenas um botão `[Período: Mês ▾]` que abre um Popover com:
  - Lista vertical de presets (7d / 30d / Mês / Ano / Tudo)
  - Seletor de datas customizadas (mantém o que já existe)
- Detectar via `useIsMobile()` ou via `sm:` classes (sem JS) — preferência por CSS para evitar hidratação.
- Estratégia: `<div className="hidden sm:flex">` para chips + `<div className="sm:hidden">` para botão único.

### `src/pages/Home.tsx`
- KPIs: `grid grid-cols-1 sm:grid-cols-3 gap-3` (em vez de `grid-cols-3` fixo); cada card vira layout horizontal no mobile (label + valor lado a lado) para densidade.
- CTAs Hero: no mobile, botões viram `w-full sm:w-auto`.
- Padding lateral `px-3 sm:px-4 md:px-8`.
- Atividade recente: linha quebra em duas no mobile — nome no topo, embaixo `data · valor · badge`.

### `src/pages/Pedidos.tsx` e `src/pages/Financeiro.tsx`
- Header: `px-3 sm:px-6 md:px-8`, título e DateFilter empilham em <sm: `flex-col sm:flex-row gap-2 sm:items-center`.
- Conteúdo: `p-3 sm:p-6 md:p-8 space-y-4 md:space-y-6`.
- KPIs: `grid grid-cols-2 md:grid-cols-3` (Financeiro) / `grid grid-cols-2 md:grid-cols-4` (Pedidos).
- Charts grid: `grid gap-3 md:gap-4 md:grid-cols-2`.

### `src/components/dashboard/OrdersTable.tsx`
- `Select` filtro: `w-full sm:w-[180px]`.
- Header do Card: empilhar verticalmente no mobile.

### `src/components/dashboard/HorizontalBarChart.tsx`
- YAxis `width={150}` → usar `width={typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 150}` (ou via `useIsMobile`).
- TickFormatter trunca em mais caracteres no mobile (15 chars).

### `src/components/dashboard/DonutChart.tsx`
- Reduzir `outerRadius` em mobile (60 em vez de 80) — usar via `useIsMobile`.

### `src/pages/Chat.tsx` (mobile fine-tuning)
- Esconder `<StatusBadge>` em <380px (`hidden xs:inline-flex`) — ou simplificar para um dot.
- Garantir que o trigger de sidebar está sempre visível no mobile (já tem, mas conferir).

### `src/components/chat/ChatEmptyState.tsx`
- `QUICK_MODELS` grid `grid-cols-1 sm:grid-cols-3 gap-2.5` — já tem; manter, mas reduzir padding em mobile.
- Suggestions chips em `flex-wrap gap-1.5` — OK; reduzir tamanho da fonte para `text-[11px]` no mobile.

### Limpeza
- Deletar `src/components/layout/AppHeader.tsx` (morto).
- Deletar `src/components/layout/DashboardLayout.tsx` (morto).

### Modais
- Localizar `ClienteDetailModal`, `PedidoDetailModal`, `CreateUserModal` e garantir `max-w-[calc(100vw-1rem)] sm:max-w-lg` no `DialogContent`. (Verifico durante implementação.)

## Aspecto técnico (resumo)

- **Sem novas dependências**: tudo Tailwind breakpoints + shadcn.
- **Hook util**: usar `useIsMobile` (já existe em `src/hooks/use-mobile.tsx`) para JS-driven cases (charts).
- **Breakpoints Tailwind**: `sm` 640, `md` 768, `lg` 1024 — manter os defaults.
- **Sem mudança de tokens HSL** — só layout/spacing.
- **Sem mudança em RPCs/views/dados**.

## Resultado esperado

- Em **mobile <640px**: navegação acessível via hambúrguer no topo de toda rota; padding compacto; KPIs e charts legíveis em 1 coluna; DateFilter colapsado em popover; tabelas viram cards; modais não cortam.
- Em **tablet 640–1024px**: grids 2 colunas, sidebar collapsed em ícone (já é assim), padding intermediário.
- Em **desktop ≥1024px**: nenhuma mudança visual em relação ao atual.

## Fora do escopo desta etapa

- PWA / Capacitor (caso queira virar app instalável depois, abordamos em uma 2ª etapa).
- Gestos de swipe (swipe-to-delete em conversas).
- Reflow profundo de modais — só ajuste de largura.
