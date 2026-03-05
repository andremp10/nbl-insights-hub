

# Plano — Refatorar Sugestoes, ThinkingBubble e Composer

## 3 Problemas Identificados

1. **Sugestoes ocupam a pagina toda** — os 8 prompts estruturados mostram o texto completo do prompt como label, ficando enormes. Precisam de titulo curto visivel + prompt real escondido que so e enviado ao clicar.

2. **ThinkingBubble descentralizado e feio** — o componente usa `pr-12` que empurra pra esquerda, tem avatar com ping animation exagerado, e o layout nao se alinha com o centro do chat (max-w-[860px]).

3. **Composer com botao desalinhado** — o `absolute right-3 bottom-3` fica desalinhado quando o textarea tem 1 linha porque o container tem `p-1.5`. Precisa centralizar verticalmente.

---

## Mudancas

### 1. `src/components/chat/ChatEmptyState.tsx` — Sugestoes com titulo separado do prompt

Substituir o array de strings por objetos `{ title, prompt }`:

```typescript
const SUGGESTIONS = [
  { title: 'Faturamento vs mês anterior', prompt: 'Qual o faturamento total do mês atual? Compare com o mês anterior e mostre a variação percentual' },
  { title: 'Top 10 clientes', prompt: 'Liste os 10 maiores clientes por valor total de pedidos nos últimos 30 dias, em formato de ranking' },
  { title: 'Pedidos atrasados', prompt: 'Quais pedidos estão atrasados neste momento? Mostre cliente, valor e dias de atraso' },
  { title: 'Resumo financeiro do mês', prompt: 'Resumo financeiro do mês atual: receita total, despesas totais e resultado líquido' },
  { title: 'Maiores despesas', prompt: 'Quais as 5 maiores categorias de despesa dos últimos 30 dias? Mostre valor e percentual do total' },
  { title: 'Status dos pedidos', prompt: 'Quantos pedidos temos em cada status atualmente? Mostre em formato de resumo' },
  { title: 'Receita vs despesas (3 meses)', prompt: 'Compare receita e despesas dos últimos 3 meses, mês a mês' },
  { title: 'Pagamentos pendentes', prompt: 'Quais pagamentos ou contas estão pendentes? Liste por valor e data de vencimento' },
];
```

Cada botao mostra apenas `title` (curto, 1 linha). Ao clicar envia `prompt` completo.
Grid compacto: `grid-cols-2 sm:grid-cols-4 gap-2`, cada chip com padding menor (`px-3 py-2`).
Isso reduz de ~8 cards de 2 linhas para chips compactos de 1 linha.

### 2. `src/components/chat/ThinkingBubble.tsx` — Redesenho centralizado

Problemas atuais:
- `pr-12` causa descentralizacao
- Avatar com `animate-ping` e exagerado
- Layout nao respeita max-w do chat

Novo design:
- Remover `pr-12` e `w-full`
- Container inline simples: avatar pequeno (sem ping) + texto rotativo + dots em linha
- Layout: `flex items-center gap-3` com `max-w-[860px] mx-auto` aplicado no pai (Chat.tsx ja faz isso)
- Visual mais limpo: sem bolha `chat-bubble-assistant`, usar fundo sutil `bg-muted/30 rounded-xl px-4 py-3`
- Dots menores e mais sutis (w-1.5 h-1.5)
- Texto e dots na mesma linha (nao empilhados)

### 3. `src/pages/Chat.tsx` — Composer com botao centralizado

Ajustar posicionamento do botao enviar:
- Quando 1 linha (minHeight 40px): botao centralizado verticalmente via `top-1/2 -translate-y-1/2 right-3`
- Remover `bottom-3` fixo
- Container: manter `bg-muted/40 rounded-2xl` mas usar `p-2` em vez de `p-1.5` para mais respiro

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/chat/ChatEmptyState.tsx` | Sugestoes com titulo curto separado do prompt real, grid 4 colunas compacto |
| `src/components/chat/ThinkingBubble.tsx` | Redesenho: inline, centralizado, sem ping, dots+texto na mesma linha |
| `src/pages/Chat.tsx` | Botao enviar centralizado verticalmente no composer |

