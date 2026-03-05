

# Plano Completo — Refatoracao do Chat (Header, Composer, Sugestoes, Quick Actions)

## Resumo das Mudancas

4 intervencoes cirurgicas: limpar header, redesenhar composer, reescrever sugestoes com prompt engineering real, e reformular quick actions contextuais.

---

## 1. `src/pages/Chat.tsx` — Header + Composer

### Header
- Remover botoes **Download** e **Trash2** (Limpar contexto). Manter apenas **Plus** (Nova conversa).
- Remover imports `Download`, `Trash2` e funcoes `handleExport`, `handleClearContext`.

### Composer — Redesenho completo
- **Remover** constantes `PERIOD_CHIPS` e `INTENT_CHIPS` (linhas 13-23).
- **Remover** toda a barra de chips, toggle curta/detalhada, e hint "Enter para enviar".
- **Remover** estado `responseMode` e logica de append `[resposta detalhada]`.

Novo design do `ChatComposer`:
- Container unico com `bg-muted/40 rounded-2xl p-1.5` (pill style, como ChatGPT/Linear)
- Textarea **sem borda** (`border-0 bg-transparent focus:ring-0`), padding confortavel
- Botao enviar **circular** `w-8 h-8 rounded-full` posicionado `absolute right-3 bottom-3`, centralizado quando 1 linha
- Quando `sending`: mostrar Loader2 dentro do botao (sem texto externo "Aguardando...")
- Placeholder: "Pergunte sobre financeiro, pedidos, clientes..."

---

## 2. `src/components/chat/ChatEmptyState.tsx` — Prompts Estruturados

### Problema atual
Os chips sao frases soltas sem contexto ("Faturamento do mes", "Top 10 clientes"). O agente recebe texto ambiguo sem periodo, sem formato, sem escopo. Isso gera respostas genericas ou perguntas de refinamento desnecessarias.

### Engenharia de prompts — Principios aplicados
Cada sugestao sera um **prompt completo** que:
1. Define o **escopo** (financeiro / pedidos)
2. Especifica o **periodo** (mes atual, ultimos 30 dias)
3. Indica o **formato esperado** (resumo, lista, ranking, comparativo)
4. Inclui **instrucao de detalhe** quando relevante (ex: "inclua percentual de variacao")

### Novas sugestoes (8 prompts estruturados)

```
1. "Qual o faturamento total do mês atual? Compare com o mês anterior e mostre a variação percentual"
2. "Liste os 10 maiores clientes por valor total de pedidos nos últimos 30 dias, em formato de ranking"
3. "Quais pedidos estão atrasados neste momento? Mostre cliente, valor e dias de atraso"
4. "Resumo financeiro do mês atual: receita total, despesas totais e resultado líquido"
5. "Quais as 5 maiores categorias de despesa dos últimos 30 dias? Mostre valor e percentual do total"
6. "Quantos pedidos temos em cada status atualmente? Mostre em formato de resumo"
7. "Compare receita e despesas dos últimos 3 meses, mês a mês"
8. "Quais pagamentos ou contas estão pendentes? Liste por valor e data de vencimento"
```

### Layout
- Grid `grid-cols-1 sm:grid-cols-2 gap-2`
- Cada item: card clicavel com texto visivel, `text-sm`, `rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 p-3`
- Truncar visualmente se necessario (2 linhas max com `line-clamp-2`) mas enviar o prompt completo

### Modelos rapidos — Queries atualizadas
Mesma logica de prompt engineering:
- **Resumo Financeiro**: `"Gere um resumo financeiro completo do mês atual. Inclua receita total, despesas totais, resultado líquido e as 3 maiores categorias de despesa com valores"`
- **Status de Pedidos**: `"Faça um resumo do status atual de todos os pedidos. Quantos estão aprovados, em produção, concluídos e atrasados? Destaque os que precisam de atenção"`
- **Top Clientes**: `"Mostre o ranking dos 10 maiores clientes por valor total de pedidos no mês atual, com nome e valor total de cada um"`

---

## 3. `src/components/chat/ChatMessage.tsx` — Quick Actions Contextuais

### Problema atual
Os quick actions sao genericos e vagos ("Refinar periodo", "Top 10", "Agrupar por status"). Nao dao contexto ao agente sobre O QUE refinar, de QUAL consulta.

### Nova abordagem
Quick actions com **prompts completos e referenciados** que fazem sentido como follow-up de qualquer resposta:

```typescript
const QUICK_ACTIONS = [
  {
    label: 'Detalhar mais',
    query: 'Com base na sua última resposta, detalhe mais os dados. Inclua breakdown por categoria ou cliente quando possível'
  },
  {
    label: 'Últimos 7 dias',
    query: 'Refaça a mesma consulta anterior, mas considerando apenas os últimos 7 dias'
  },
  {
    label: 'Comparar períodos',
    query: 'Compare os dados da última consulta com o período anterior equivalente e mostre a variação'
  },
  {
    label: 'Exportar dados',
    query: 'Mostre os dados da última consulta em formato de tabela completa para que eu possa copiar'
  },
];
```

Cada chip continua com visual discreto (`text-[11px] rounded-md border`) mas envia um prompt real e util.

---

## Arquivos Editados

| Arquivo | Acao |
|---------|------|
| `src/pages/Chat.tsx` | Remover Download/Trash2 do header, redesenhar composer (sem chips, visual pill, botao centralizado) |
| `src/components/chat/ChatEmptyState.tsx` | 8 prompts estruturados + queries dos modelos rapidos reescritas |
| `src/components/chat/ChatMessage.tsx` | Quick actions com prompts completos e contextuais |

