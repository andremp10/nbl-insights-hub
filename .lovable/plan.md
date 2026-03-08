

# Plano — Performance e Loading do Financeiro e Pedidos

## Diagnostico

Analisei os dados e a arquitetura. Os numeros:
- **85.872 pedidos**, **124.056 itens**, **98.197 lancamentos financeiros**
- Filtro padrao e `all_time` (desde 2019) — carrega TUDO
- A view `vw_dashboard_pedidos` faz LATERAL subquery com `string_agg` para cada pedido — pesada
- As RPCs financeiras usam `COALESCE(data_emissao, data_pagto)` que impede uso de indices
- React Query sem `staleTime` — refaz query a cada navegacao entre abas
- Supabase tem limite de 1000 rows por query — com `all_time`, so retorna 1000 de 85K (dados incompletos)

## Solucoes

### 1. Mudar filtro padrao de `all_time` para `this_month`
**Arquivo:** `src/contexts/DateFilterContext.tsx`

Mudar o preset inicial de `all_time` para `this_month`. Isso reduz a query de 85K rows para ~1-2K rows. Impacto imediato e drastico.

### 2. Adicionar `staleTime` e `placeholderData` no React Query
**Arquivos:** `src/hooks/useFinanceiro.ts`, `src/hooks/usePedidos.ts`

- `staleTime: 5 * 60 * 1000` (5 min) — evita refetch ao navegar entre abas
- `placeholderData: keepPreviousData` — ao mudar filtro, mostra dados antigos enquanto carrega os novos (sem tela branca)

### 3. Indice de expressao para financeiro
**Migracao SQL**

O `COALESCE(data_emissao, data_pagto)` nas RPCs financeiras nao usa nenhum indice. Criar um indice funcional:

```sql
CREATE INDEX idx_fin_lanc_competencia 
ON is_financeiro_lancamentos (
  (COALESCE(data_emissao, data_pagto)::date)
) WHERE status IN (1, 2);
```

Isso acelera as RPCs `get_financeiro_kpis` e `get_financeiro_graficos`.

### 4. Indice composto para view de pedidos
**Migracao SQL**

A view filtra `is_pedidos.created_at` via range. Criar indice composto:

```sql
CREATE INDEX idx_is_pedidos_created_cliente 
ON is_pedidos (created_at DESC, cliente_id);
```

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/contexts/DateFilterContext.tsx` | Mudar preset padrao para `this_month` |
| `src/hooks/useFinanceiro.ts` | Adicionar staleTime + placeholderData |
| `src/hooks/usePedidos.ts` | Adicionar staleTime + placeholderData |
| Migracao SQL | Criar 2 indices (expressao financeiro + composto pedidos) |

