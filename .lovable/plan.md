

# Plano — Corrigir Rota Default + Loading Escuro com Animacao

## Problemas Identificados

1. **Rota default caindo em financeiro**: O arquivo `src/pages/Index.tsx` contem `<Navigate to="/financeiro" />`, porem ele nao e usado em `App.tsx` (a rota `/` ja aponta para `Home`). O problema real e que o `AuthContext` inicia com `isAuthenticated = false` e so muda para `true` apos o `useEffect` rodar — nesse breve momento, o `ProtectedRoute` redireciona para `/auth`, e apos o login o redirect pode estar indo para `/financeiro` ao inves de `/`. Preciso verificar o fluxo de redirect pos-login no componente `Auth.tsx` e no `SignInCard`.

2. **Tela branca no loading**: O `Suspense fallback={null}` mostra nada enquanto o chunk carrega. Como o `body` e o `#root` nao tem fundo escuro forcado, o resultado e um flash branco. A correcao e dupla: (a) fundo escuro global no HTML/body e (b) fallback com fundo escuro + animacao.

## Correcoes

### 1. Fundo escuro no HTML (elimina flash branco)
- Em `index.html`: adicionar `style="background-color: #09090b"` no `<body>` (cor do dark mode background).
- Em `src/index.css`: adicionar `html, body, #root { background-color: hsl(var(--background)); }` no dark mode.

### 2. Fallback do Suspense com skeleton animado
- Trocar `fallback={null}` por um componente `PageSkeleton` que:
  - Tem fundo `bg-background` (escuro)
  - Mostra 3-4 blocos skeleton que "constroem" de cima para baixo com `animate-fade-in` escalonado (delay incremental)
  - Simula o layout da pagina sendo montada

### 3. Corrigir redirect pos-login
- Verificar `Auth.tsx` / `SignInCard` — garantir que apos login o redirect va para `/` (Home) e nao para `/financeiro`.
- Deletar `src/pages/Index.tsx` (nao e usado e contem redirect errado).
- No `AuthContext`, adicionar um estado `loading` para evitar o flash de redirect para `/auth` antes do localStorage ser lido.

### 4. Animacao de entrada dos componentes
- O `PageTransition` ja existe com fade+translateY. Ajustar para que a animacao simule construcao do topo: `initial={{ opacity: 0, y: -12 }}` (vem de cima) ao inves de `y: 6` (vem de baixo).

## Arquivos

| Arquivo | Acao |
|---------|------|
| `index.html` | Adicionar background escuro no body |
| `src/index.css` | Background escuro global |
| `src/App.tsx` | Trocar Suspense fallback por PageSkeleton |
| `src/contexts/AuthContext.tsx` | Adicionar estado `loading` para evitar flash |
| `src/components/auth/ProtectedRoute.tsx` | Checar `loading` antes de redirecionar |
| `src/components/layout/PageTransition.tsx` | Ajustar direcao da animacao (topo) |
| `src/pages/Index.tsx` | Deletar (nao usado) |

