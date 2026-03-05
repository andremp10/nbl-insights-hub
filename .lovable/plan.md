

# Plano — Botão de envio, Tema claro/escuro, Refatoração da Sidebar

## 1. Botão de envio desalinhado (ChatInput)

O `top-1/2 -translate-y-1/2` não funciona bem com textarea que cresce em altura. O botão precisa ficar fixo no **fundo** do container, não centrado verticalmente.

**Correção:** Trocar `top-1/2 -translate-y-1/2` por `bottom-1.5 right-2` no container do botão. Assim ele fica sempre ancorado no canto inferior direito, alinhado com a última linha de texto.

**Arquivo:** `src/components/chat/ChatInput.tsx` (linha 78)

---

## 2. Modo claro/escuro não funciona

O `ThemeProvider` e `ThemeToggle` já existem e estão integrados no `App.tsx` e `AppHeader.tsx`. Porém:
- O `AppLayout.tsx` tem `className="dark"` hardcoded na div raiz — isso força dark mode sempre, ignorando o ThemeProvider.
- O `ThemeToggle` está no `AppHeader` mas o `AppHeader` **não é usado** no layout atual (o layout usa `AppSidebar` diretamente, sem header).

**Correções:**
- Remover `dark` hardcoded do `AppLayout.tsx`.
- Adicionar o `ThemeToggle` dentro da `AppSidebar` (no footer, ao lado do botão de logout) para que fique acessível.

**Arquivos:** `src/components/layout/AppLayout.tsx`, `src/components/layout/AppSidebar.tsx`

---

## 3. Refatoração visual da Sidebar

A sidebar atual tem ícones pequenos (18px), indicador de ativo sutil e visual genérico.

**Redesenho:**
- Ícones maiores: `h-5 w-5` (20px).
- Trocar ícones para mais expressivos: `LayoutDashboard` (Home), `Bot` (Assistente), `Wallet` (Financeiro), `PackageSearch` (Pedidos).
- Item ativo: fundo `bg-primary/15` com borda esquerda mais grossa (`w-[3px] h-5`) e texto `font-medium`.
- Hover: `bg-accent/60` com transição suave.
- Maior espaçamento entre itens (`space-y-1`).
- Padding maior nos itens (`py-2.5 px-3`).
- Footer: `ThemeToggle` + botão de logout lado a lado quando expandido.
- Logo: ícone maior (`h-9 w-9`) com gradiente sutil.

**Arquivo:** `src/components/layout/AppSidebar.tsx`

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/chat/ChatInput.tsx` | Botão ancorado no bottom-right |
| `src/components/layout/AppLayout.tsx` | Remover classe `dark` hardcoded |
| `src/components/layout/AppSidebar.tsx` | Redesenho visual completo + ThemeToggle |

