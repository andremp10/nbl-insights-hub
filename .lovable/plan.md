

# Plano de Acao — Interatividade em Pedidos + Analise do Chat

## Ponto 1: Clicar no pedido para ver detalhes

Hoje, a tabela de pedidos so permite clicar no **nome do cliente**. O usuario quer tambem clicar na **linha do pedido** para ver detalhes daquele pedido especifico.

### O que fazer:
- **Criar `PedidoDetailModal`** — novo componente Dialog que exibe os dados completos de um pedido individual:
  - Data de criacao, status, valor total, frete, qtde de itens
  - Info do cliente (nome, email, telefone)
  - Flag de atraso com dias em atraso
  - Dados adicionais que podem vir da view (obs, frete_tipo etc.)
- **Atualizar `OrdersTable`** — adicionar state para `selectedPedido` e tornar a linha da tabela clicavel (ou adicionar um botao/icone "ver detalhes" na linha). Clicar na linha abre o `PedidoDetailModal`, clicar no nome do cliente continua abrindo o `ClienteDetailModal`.
- **Enriquecer o `ClienteDetailModal`** — na secao "Resumo no periodo", listar os pedidos individuais do cliente com status e valor, e tornar cada pedido clicavel para abrir o `PedidoDetailModal` em cascata.

### Dados necessarios:
A view `vw_dashboard_pedidos` ja contem os campos necessarios. Nenhuma alteracao de SQL e necessaria para este ponto.

---

## Ponto 2: Clicar nas barras do grafico Top 10 Clientes

Hoje o `HorizontalBarChart` e generico e nao suporta cliques. O usuario quer clicar em uma barra do "Top 10 Clientes" e ver os detalhes daquele cliente + seus pedidos.

### O que fazer:
- **Adicionar prop `onBarClick`** ao `HorizontalBarChart` — callback opcional `(name: string) => void`.
- **Usar `onClick` do `<Bar>`** do Recharts para capturar o clique na barra e disparar o callback com o nome do cliente.
- **Em `Pedidos.tsx`** — ao receber o clique, filtrar `allItems` (do `usePedidosData`) pelo `cliente_nome` clicado, montar um `PedidoItem` representativo e abrir o `ClienteDetailModal` com os pedidos daquele cliente.
- **Atualizar `useTopClientes`** para tambem retornar o `cliente_id` associado (ou manter a busca por nome, ja que o agrupamento e por nome).

### Detalhes tecnicos:
- Recharts suporta `onClick` no componente `<Bar>`. Basta adicionar `onClick={(data) => onBarClick?.(data.name)}`.
- O `Pedidos.tsx` precisara do `usePedidosData()` para ter acesso a todos os items e filtrar por cliente.

---

## Ponto 3: Analise de Viabilidade — Chat interativo com modais contextuais

### O que o usuario quer:
Quando o agente responde algo sobre um cliente ou pedido, o usuario quer poder clicar na resposta e abrir um modal com mais informacoes (como o `ClienteDetailModal` ou `PedidoDetailModal`).

### Viabilidade: **Sim, e possivel**, com uma arquitetura em duas camadas.

### Como funcionaria:

**Camada 1 — Resposta estruturada do n8n:**
O webhook do n8n ja suporta (no contrato) o campo `reply.suggested_actions`. Bastaria o agente retornar acoes do tipo:
```json
{
  "type": "open_cliente",
  "cliente_nome": "graficadivinoespiritosanto@gmail.com",
  "label": "Ver detalhes do cliente"
}
```

**Camada 2 — Renderizacao no `ChatMessage`:**
- Parsear `suggested_actions` da resposta do agente
- Renderizar como botoes/chips clicaveis abaixo da mensagem
- Ao clicar, buscar o `cliente_id` ou `pedido_id` nos dados ja carregados (ou fazer uma query pontual) e abrir o modal correspondente

### Limitacoes e riscos:
- Requer que o n8n/agente retorne dados estruturados, nao apenas texto. Hoje o agente retorna apenas `reply.text`.
- A edge function `nlq-proxy` precisa repassar esses campos extras para o front (atualmente so salva `content` como texto).
- **Alternativa mais simples**: detectar padroes no texto da resposta (ex: nomes de clientes mencionados) e transforma-los em links clicaveis via regex no `ChatMessage`. Isso nao depende de mudancas no n8n, mas e menos preciso.

### Recomendacao:
Implementar primeiro os pontos 1 e 2 (que criam os modais reutilizaveis). Depois, como segundo passo, adicionar a integracao no chat — comecando pela abordagem simples (deteccao de padroes no texto) e evoluindo para acoes estruturadas quando o n8n for ajustado.

---

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/dashboard/PedidoDetailModal.tsx` | **Criar** — modal com detalhes do pedido |
| `src/components/dashboard/ClienteDetailModal.tsx` | **Editar** — listar pedidos individuais clicaveis |
| `src/components/dashboard/OrdersTable.tsx` | **Editar** — linha clicavel para abrir detalhe do pedido |
| `src/components/dashboard/HorizontalBarChart.tsx` | **Editar** — adicionar prop `onBarClick` |
| `src/pages/Pedidos.tsx` | **Editar** — integrar clique no grafico + states dos modais |
| `src/hooks/usePedidos.ts` | **Editar** — expor `cliente_id` no `useTopClientes` |

Nenhuma migracao SQL necessaria para os pontos 1 e 2.

