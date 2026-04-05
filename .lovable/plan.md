

# Plano — Otimizacao de Performance Geral

## Problemas identificados

### 1. Requisicao com erro 500 na Home
A Home faz uma query com `is_finalizado=eq.false` na `vw_dashboard_pedidos` que retorna **500**. Essa coluna pode nao existir na view. Isso bloqueia o KPI de "Atrasados" e gera erro silencioso.

### 2. Triple fetch de `app_users` no auth
O `AuthContext` faz `fetchAppUser` tanto no `onAuthStateChange` quanto no `getSession`, resultando em **3 chamadas identicas** de `app_users` a cada load (visivel nos network requests). Deveria fazer apenas 1.

### 3. Home faz queries diretas sem React Query
A pagina Home usa `useEffect` + `supabase` direto, sem cache. Toda vez que o usuario navega de volta para Home, todas as 4 queries sao refeitas do zero. Deveria usar React Query com `staleTime` como Financeiro/Pedidos.

### 4. Supabase limit de 1000 rows nos Pedidos
`usePedidosData` faz `select('*')` na `vw_dashboard_pedidos` sem limit. Com ~85K pedidos no historico, mesmo com filtro `this_month`, o Supabase retorna no maximo 1000 rows. Para meses com muitos pedidos, dados ficam incompletos. Para KPIs e charts, o ideal seria usar RPCs server-side (como o financeiro ja faz).

### 5. ProtectedRoute retorna `null` durante loading
Enquanto auth carrega, `ProtectedRoute` retorna `null` — tela completamente branca. Deveria mostrar o skeleton da pagina.

### 6. Framer Motion em todos os wrappers de mensagem
No Chat, cada `ChatMessage` usa `motion.div` como wrapper mesmo quando `animate=false`. Ja esta otimizado no codigo atual (usa `'div'` quando nao anima) — OK.

## Solucoes propostas

### A. Corrigir query de atrasados na Home (erro 500)
**Arquivo:** `src/pages/Home.tsx`

A query `eq('is_finalizado', false)` esta falhando. Remover essa query ou usar uma abordagem diferente:
- Filtrar atrasados diretamente com `eq('is_atrasado', true)` sem o filtro `is_finalizado`
- Ou envolver em try/catch individual para nao bloquear os outros KPIs

### B. Eliminar fetch duplicado de `app_users`
**Arquivo:** `src/contexts/AuthContext.tsx`

O `onAuthStateChange` ja dispara com a sessao inicial. Remover o `getSession().then(...)` duplicado e confiar apenas no listener. Isso elimina 2 das 3 chamadas a `app_users`.

### C. Migrar Home para React Query
**Arquivo:** `src/pages/Home.tsx`

Criar hooks `useHomeKPIs()` e `useRecentOrders()` usando React Query com:
- `staleTime: 5 * 60 * 1000`
- `placeholderData: keepPreviousData`

Isso garante cache entre navegacoes e elimina refetches desnecessarios.

### D. Mostrar skeleton no ProtectedRoute durante loading
**Arquivo:** `src/components/auth/ProtectedRoute.tsx`

Em vez de retornar `null`, retornar o `PageSkeleton` generico para eliminar a tela branca durante verificacao de auth.

### E. Adicionar limite seguro nos Pedidos
**Arquivo:** `src/hooks/usePedidos.ts`

Adicionar `.limit(1000)` explicito na query de `usePedidosData` para documentar a limitacao. Idealmente, criar uma RPC `get_pedidos_kpis` no servidor (como ja existe para financeiro) para agregar server-side sem transferir 1000 rows.

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/contexts/AuthContext.tsx` | Eliminar fetch duplicado de app_users |
| `src/pages/Home.tsx` | Migrar para React Query + corrigir query is_finalizado |
| `src/components/auth/ProtectedRoute.tsx` | Mostrar skeleton em vez de null durante loading |
| `src/hooks/usePedidos.ts` | Adicionar limit explicito |

