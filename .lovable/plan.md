## Contexto

Os dados das views `vw_dashboard_financeiro` e `vw_dashboard_pedidos` (e RPCs derivadas) são atualizados pelo ETL **somente uma vez por dia, às 04:30 da manhã** (horário de Fortaleza). Hoje, todos os hooks de Financeiro, Pedidos, Home (KPIs e Atividade Recente) usam `staleTime: 5 minutos` no React Query, o que faz com que:

- Cada troca de aba/rota dispare refetch (montagem do componente).
- Cada `window focus` dispare refetch (default do React Query).
- Cada reconexão dispare refetch.
- Vários usuários simultâneos multipliquem essas queries pesadas no Postgres.

Resultado: Supabase em estado de "exhausting multiple resources" como mostrado nos logs.

Como o dado **não muda durante o dia**, todo refetch antes das 04:30 do dia seguinte é desperdício puro.

## Estratégia

Trocar o cache time-based fixo por um cache **alinhado ao próximo ETL (04:30 America/Fortaleza)**. O dado fica "fresh" até esse horário, depois invalida automaticamente uma única vez.

Camadas de defesa:

1. **`staleTime` dinâmico** = `próximo_04:30 - agora` (ms). Enquanto fresh, React Query NUNCA vai à rede, mesmo com remount.
2. **`gcTime`** alto (24h) para manter dados em memória entre navegações.
3. **Desligar refetch automáticos** que são inúteis nesse contexto:
   - `refetchOnWindowFocus: false`
   - `refetchOnReconnect: false`
   - `refetchOnMount: false` (já temos placeholderData)
   - `refetchInterval: false`
4. **Persistência opcional em `localStorage`** (chave por usuário + data ETL) para sobreviver a refresh da página sem hit no banco. Implementação leve, manual no hook (sem dependência nova).

## Arquivos a alterar

### 1. Novo helper: `src/lib/etlCache.ts`
- `getNextEtlTimestamp()`: retorna o timestamp do próximo 04:30 America/Fortaleza.
- `getCurrentEtlBucket()`: string `YYYY-MM-DD` representando o "ciclo ETL atual" (usada como cache key e chave de localStorage).
- `getEtlStaleTime()`: ms até o próximo 04:30.
- `loadFromLocal<T>(key)` / `saveToLocal<T>(key, data)`: persistência simples por bucket ETL, com expiração automática (chaves antigas ignoradas).

### 2. Configuração global do QueryClient (provavelmente `src/main.tsx` ou `src/App.tsx`)
Definir defaults globais conservadores:
```ts
defaultOptions: {
  queries: {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    gcTime: 24 * 60 * 60 * 1000,
  }
}
```
Isso já elimina a maior fonte de refetchs sem tocar em hook nenhum.

### 3. Hooks afetados — trocar `staleTime: 5 * 60 * 1000` por `staleTime: getEtlStaleTime()` e adicionar `gcTime` longo + `refetchOnMount: false`:
- `src/hooks/useFinanceiro.ts` — `useFinanceiroKPIs`, `useCategoriasDespesas`.
- `src/hooks/usePedidos.ts` — `usePedidosData` (todos os outros hooks derivam dele).
- `src/hooks/useHomeData.ts` — `useHomeKPIs`, `useRecentOrders`.

Incluir o bucket ETL no `queryKey` para garantir invalidação automática à 04:30:
```ts
queryKey: ['pedidos', etlBucket, fromDate, toDate]
```

### 4. Persistência localStorage (somente nesses 3 hooks)
Antes de chamar a query, tentar `loadFromLocal(key)`; se existir e for do bucket atual, usar como `initialData`. Após sucesso, `saveToLocal`. Isso elimina hit no banco mesmo após F5.

### 5. Chat NÃO é afetado
Os hooks `useChatMessages` e `useChatSessions` continuam com Realtime + polling como definido na arquitetura assíncrona. O cache ETL aplica-se SOMENTE a dados de dashboard.

## Comportamento resultante

- Primeira carga do dia: 1 query por hook → cache local + memória.
- Navegação entre Home/Pedidos/Financeiro: zero queries adicionais.
- Troca de filtro de data: 1 query nova (cache key diferente), depois cacheada até 04:30.
- F5 / reabrir aba: lê localStorage, zero hit no banco.
- 04:30 America/Fortaleza: cache invalida automaticamente; próxima interação refetcha.
- Botão manual de "Atualizar" (se existir / quando criarmos): chama `queryClient.invalidateQueries` explicitamente — único caminho de refresh forçado durante o dia.

## Riscos e mitigações

- **Usuário deixa aba aberta cruzando 04:30**: invalidação por mudança de `queryKey` (bucket muda) garante refetch na próxima interação.
- **Mudança de timezone do dispositivo**: cálculo é feito em `America/Fortaleza` via `Intl.DateTimeFormat`, não no fuso local.
- **localStorage corrompido**: helper faz try/catch e ignora; cai no fetch normal.
- **Filtros personalizados gerando muitas chaves**: `gcTime` 24h + limite natural de combinações que o usuário usa; aceitável.

## Não incluso (fora de escopo)

- Materialized views ou cache server-side no Postgres.
- Service Worker / cache HTTP.
- Refatoração dos hooks de chat.

Confirme para eu executar.