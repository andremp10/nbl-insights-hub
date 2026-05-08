## Problema

A sidebar atual só tem dois estados ("totalmente aberta" 13.5rem ou "totalmente fechada" 3.25rem). Alternar empurra todo o layout e o estado fechado fica visualmente "amputado".

## Solução: rail fixo com expansão por hover (overlay)

A sidebar passa a ser **sempre rail (56px)** no desktop. Ao passar o mouse, ela expande para 220px **sobrepondo o conteúdo** (não empurra), mostrando os labels com fade. Resultado: layout estável, ícones sempre visíveis, labels acessíveis sem clique. No mobile mantém o `Sheet` (drawer) atual via `useSidebar().openMobile`.

## Mudanças

### `src/components/layout/AppSidebar.tsx` — reescrever
- Remover dependência dos componentes shadcn `Sidebar`/`SidebarHeader`/etc. (mantém apenas `useSidebar` para o estado mobile).
- Desktop: `<aside>` `position: fixed`, `width: 56px`, `onMouseEnter` aumenta para 220px, `onMouseLeave` volta. Sombra sutil aparece quando expandido.
- Antes do `<aside>` fixo, um `<div>` "spacer" com `width: 56px` reserva o espaço no flex do layout (sem layout shift).
- Labels usam `opacity-0 group-hover/sidebar:opacity-100 transition-opacity`.
- Tooltips (shadcn) nos itens do menu para o estado colapsado.
- Header: logo + "NBL Gráfica / Insights Hub" (texto fade).
- Menu: Home, Assistente, Financeiro, Pedidos com indicador lateral primário no item ativo.
- Footer: "Novo usuário" (master), "Sair", linha do `ThemeToggle`.
- Mobile: renderiza `<Sheet>` controlado por `openMobile`/`setOpenMobile` com a mesma estrutura interna em modo "expanded" forçado, fechando ao clicar num item.

### `src/components/ui/sidebar.tsx` — sem mudanças
Mantemos o `SidebarProvider` para preservar o estado `openMobile` que o `MobileTopBar` já dispara via `<SidebarTrigger>`. Não usaremos mais os subcomponentes visuais do shadcn na `AppSidebar`.

### `src/components/layout/AppLayout.tsx` — sem mudanças
Já envolve em `SidebarProvider` e renderiza `<AppSidebar />` ao lado do `<main>`; o spacer da nova sidebar mantém o flex correto.

### `src/components/layout/MobileTopBar.tsx` — sem mudanças
`SidebarTrigger` continua disparando `setOpenMobile(true)`.

## Detalhes visuais

- Rail: 56px de largura, ícones centralizados (gap-3 + padding consistente para que ao expandir os ícones permaneçam alinhados — sem "pulo").
- Expansão: `transition-[width] 200ms ease-out`. Labels com `transition-opacity 150ms` (delay zero, mas por ser mais rápido que a largura, evita "esticar" texto).
- Item ativo: barra `3px` à esquerda + `bg-primary/12` + `text-primary`.
- Sem botão de "colapsar/expandir" — o hover é suficiente. Remove a frustração do "tudo ou nada".
- Z-index: rail `z-40` (mesmo do MobileTopBar).

## O que NÃO muda
- Sidebar de **conversas** do `/chat` (`SessionsSidebar`).
- Layout das demais páginas.
- Auth, rotas, contexto.
