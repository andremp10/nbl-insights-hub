

# Plano — Corrigir Sidebars (Principal + Conversas)

## Diagnostico da Causa Raiz

**Sidebar Principal (AppSidebar):** Usa o componente shadcn `Sidebar` com `collapsible="icon"`. Em mobile, renderiza como um `Sheet` (dialog overlay via Radix). O `Sheet` usa `SheetOverlay` com `fixed inset-0 z-50 bg-black/80` -- este overlay captura todos os cliques quando aberto. O problema de "travar" ocorre porque:
- Em desktop, o `SidebarTrigger` so aparece no header mobile (`md:hidden`), entao em desktop so funciona via `Ctrl+B` ou o trigger interno da sidebar (que desaparece quando recolhida a icones).
- Nao ha fallback visivel para reabrir quando colapsada em desktop.

**Sidebar de Conversas (SessionsSidebar):** Usa transicao de `width` (0 a 260px) com `overflow-hidden`. Problemas:
- Animar `width` causa reflow constante (nao e performatico).
- O conteudo e desmontado (`{isOpen && ...}`) e remontado a cada toggle, perdendo estado de scroll.
- O botao de toggle quando fechada e um elemento flutuante que pode ficar atras de outros elementos.

---

## 1. Sidebar Principal — Simplificar e Garantir Robustez

**Mudancas em `AppLayout.tsx`:**
- Mostrar `SidebarTrigger` sempre (remover `md:hidden` do header), para que em desktop tambem haja um botao visivel para reabrir.
- Alternativamente, mover o trigger para fora do header e colocar de forma fixa no canto.

**Mudancas em `AppSidebar.tsx`:**
- Quando colapsada (`state === "collapsed"`), mostrar o `SidebarTrigger` dentro da sidebar (ja existe parcialmente com `{!collapsed && <SidebarTrigger>}` — inverter para mostrar quando collapsed tambem).
- Adicionar `SidebarRail` como handle de borda para arrastar/clicar e expandir (componente ja existe em `sidebar.tsx` mas nao esta sendo usado).

**Arquivos:** `src/components/layout/AppLayout.tsx`, `src/components/layout/AppSidebar.tsx`

---

## 2. Sidebar de Conversas — Usar Transform ao Inves de Width

**Reescrever `SessionsSidebar.tsx` para:**
- Usar `transform: translateX(-100%)` quando fechada ao inves de `width: 0`. Isso evita reflow e permite animacao via GPU.
- Manter o conteudo sempre montado (remover `{isOpen && ...}`), so esconder via translate. Isso preserva scroll position e evita remontagem.
- Largura fixa de 260px sempre, visibilidade controlada por translate.
- Em mobile (< md): usar overlay com backdrop semitransparente que fecha ao clicar fora. Overlay com `pointer-events: none` quando fechado.
- Botao de toggle: posicionar como parte do fluxo flex, nao flutuante. Sempre visivel independente do estado.
- Adicionar `ESC` para fechar (event listener no useEffect).
- Adicionar `will-change: transform` durante animacao.

**Estrutura final:**
```text
+------------------+-----+----------------------------+
| SessionsSidebar  | Tog | Chat content               |
| (translateX)     | gle |                            |
|                  | btn |                            |
+------------------+-----+----------------------------+
```

O toggle fica sempre no mesmo lugar, o sidebar desliza por baixo/ao lado.

**Arquivo:** `src/components/chat/SessionsSidebar.tsx`

---

## 3. Chat.tsx — Ajustar Container

- Garantir que o wrapper do chat use `overflow-hidden` para que o sidebar de conversas nao cause scroll horizontal.
- Estrutura: `flex flex-1 min-h-0 overflow-hidden` no container pai.

**Arquivo:** `src/pages/Chat.tsx`

---

## 4. Melhorias Visuais

- SessionsSidebar: transicao suave de 200ms em `transform`, sem spring/bounce.
- Hover states mais claros nos itens de sessao.
- Backdrop em mobile: `bg-black/40` com fade in/out.
- Botao toggle: icone `PanelLeftClose` / `PanelLeft` ao inves de chevrons para consistencia com a sidebar principal.

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/layout/AppLayout.tsx` | Mostrar SidebarTrigger em todas as telas |
| `src/components/layout/AppSidebar.tsx` | Adicionar SidebarRail + trigger quando collapsed |
| `src/components/chat/SessionsSidebar.tsx` | Reescrever: translateX, always mounted, ESC, overlay mobile |
| `src/pages/Chat.tsx` | Adicionar overflow-hidden no container |

