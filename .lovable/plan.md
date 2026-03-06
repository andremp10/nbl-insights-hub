

# Plano — Reestruturar aba Pedidos

## Problema 1: Layout — graficos abaixo da tabela
Atualmente: KPIs > Tabela > Graficos. O usuario quer: KPIs > Graficos > Tabela.

**Solucao:** Inverter a ordem em `src/pages/Pedidos.tsx` — mover o grid dos graficos para antes do `<OrdersTable />`.

## Problema 2: Nomes dos clientes sao UUIDs truncados
A view `vw_dashboard_pedidos` gera `cliente_nome` via `COALESCE(pf.nome || pf.sobrenome, pj.razao_social, 'Cliente #' || left(id, 8))`. As tabelas `is_clientes_pf` e `is_clientes_pj` estao **vazias**, entao TODOS os clientes caem no fallback `Cliente #uuid`.

O dado real disponivel e o `email_log` da tabela `is_clientes` (ex: `graficadivinoespiritosanto@gmail.com`). Esse e o unico identificador legivel.

**Solucao em duas partes:**

### 2a. Atualizar a view SQL
Alterar `vw_dashboard_pedidos` para fazer JOIN com `is_clientes` e usar `email_log` como fallback antes do UUID:

```sql
COALESCE(
  NULLIF(TRIM(pf.nome || ' ' || pf.sobrenome), ''),
  pj.razao_social,
  c.email_log,               -- << novo fallback
  'Cliente #' || left(p.cliente_id::text, 8)
)
```

Tambem adicionar `c.email_log` e `c.telefone` como colunas extras na view para o modal de detalhes.

### 2b. Modal de detalhes do cliente (click no nome)
Criar `src/components/dashboard/ClienteDetailModal.tsx`:
- Dialog/Sheet que abre ao clicar no nome do cliente na tabela
- Busca dados de `is_clientes` pelo `cliente_id`
- Exibe: email, telefone, celular, tipo (PF/PJ)
- Lista os pedidos recentes daquele cliente no periodo (ja disponivel nos dados carregados)

### 2c. Atualizar OrdersTable
- Tornar o nome do cliente clicavel (botao/link com hover)
- Ao clicar, abrir o modal com detalhes

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Recriar `vw_dashboard_pedidos` com `email_log` como fallback e colunas extras |
| `src/pages/Pedidos.tsx` | Inverter ordem: graficos antes da tabela |
| `src/components/dashboard/ClienteDetailModal.tsx` | Novo — modal com info do cliente |
| `src/components/dashboard/OrdersTable.tsx` | Nome clicavel, abrir modal |
| `src/hooks/usePedidos.ts` | Atualizar interface `PedidoItem` com novos campos |

