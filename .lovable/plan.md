
# Plano — Progress Bar Global + Lazy Loading Estruturado

## Diagnóstico atual

Problemas identificados:
1. **Tela branca total** durante lazy loading (Suspense só mostra PageSkeleton básico)
2. **Sem feedback visual de progresso** durante fetches de dados (5-10s de espera em "all_time")
3. **Skeletons genéricos** — cada aba deveria ter skeleton específico que mimetiza o layout real
4. **Nenhum indicador de loading progressivo** — não fica claro se está carregando ou travado

## Solução proposta

### 1. Progress Bar Global (topo da tela)
Implementar barra de progresso **fixa no topo** (estilo YouTube/GitHub):
- Aparece automaticamente durante queries do React Query
- Usa hooks `onFetch`, `onSuccess`, `onError` do QueryClient
- Componente: **`LoadingBar`** (reutilizável)
- Biblioteca sugerida: implementação custom com `framer-motion` (evita dependência extra)
- Posição: `fixed top-0 left-0 right-0 z-50 h-0.5`

### 2. Skeletons específicos por aba
Criar 3 skeletons dedicados em vez do genérico:

**A) `FinanceiroSkeleton`** — mimetiza layout real:
```
┌─────────────────────────────────────────┐
│ Financeiro               [DateFilter]  │
├─────────────────────────────────────────┤
│ [KPI 3 cards]                           │
│ [Donut Chart] [Bar Chart]              │
└─────────────────────────────────────────┘
```

**B) `PedidosSkeleton`** — layout 4 KPIs + charts + tabela:
```
┌─────────────────────────────────────────┐
│ Pedidos                  [DateFilter]  │
├─────────────────────────────────────────┤
│ [KPI 4 cards]                           │
│ [Donut Chart] [Bar Chart]              │
│ [Table skeleton]                        │
└─────────────────────────────────────────┘
```

**C) `HomeSkeleton`** — hero + nav cards + KPIs:
```
┌─────────────────────────────────────────┐
│ [Hero title + subtitle]                 │
│ [3 nav cards horizontais]               │
│ [3 KPI mini cards]                      │
│ [Atividade recente lista]              │
└─────────────────────────────────────────┘
```

### 3. Integração com React Query
Modificar `App.tsx` para adicionar listener global:
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onFetch: () => setProgress(true),
      onSuccess: () => setProgress(false),
      onError: () => setProgress(false),
    },
  },
});
```

### 4. Lazy loading progressivo nos componentes de dados
Cada aba já usa hooks separados (KPIs, gráficos, tabela).
**Otimização**: renderizar skeletons individuais enquanto cada hook carrega:
- KPI skeleton → substituído quando `kpisLoading=false`
- Chart skeleton → substituído quando `chartLoading=false`
- Evita "tudo branco → tudo de uma vez"

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/layout/LoadingBar.tsx` | **Criar** — barra de progresso global animada |
| `src/components/layout/FinanceiroSkeleton.tsx` | **Criar** — skeleton específico layout Financeiro |
| `src/components/layout/PedidosSkeleton.tsx` | **Criar** — skeleton específico layout Pedidos |
| `src/components/layout/HomeSkeleton.tsx` | **Criar** — skeleton específico layout Home |
| `src/App.tsx` | **Editar** — adicionar LoadingBar + mapear Suspense fallbacks específicos |
| `src/pages/Financeiro.tsx` | **Editar** — envolver em Suspense com FinanceiroSkeleton |
| `src/pages/Pedidos.tsx` | **Editar** — envolver em Suspense com PedidosSkeleton |
| `src/pages/Home.tsx` | **Editar** — envolver em Suspense com HomeSkeleton |

## Detalhes técnicos

**LoadingBar**:
- State global via Context ou zustand (leve)
- `motion.div` com `initial={{ scaleX: 0 }}`, `animate={{ scaleX: progress }}`, `transition: spring`
- Cor: `bg-primary` (laranja NBL)
- Altura: `h-0.5` ou `h-1`

**Skeletons**:
- Usar componente `Skeleton` existente
- Adicionar delays escalonados (`animationDelay`) para efeito cascata
- Classes dark mode já funcionam

**React Query**:
- Usar `useIsFetching()` do `@tanstack/react-query` para detectar fetches globais
- Incrementar/decrementar contador de queries ativas
- Progress bar visível enquanto `fetchingCount > 0`
