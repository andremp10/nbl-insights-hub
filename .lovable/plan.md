

# Plano — Streaming Inteligente com Indicadores de Etapas do Agente

## Problema Atual

O proxy (`nlq-proxy`) tenta filtrar os chunks do n8n usando uma heuristica de "agentBlockCount >= 2", mas isso e fragil e esta vazando conteudo interno do agente (logs de tool calls, thinking, etc.) para o usuario. Alem disso, enquanto o agente esta processando (chamando tools, consultando banco, etc.), o usuario ve apenas uma barra de shimmer estatica sem informacao do que esta acontecendo.

## Solucao: SSE com Eventos Tipados

### Mudanca na Edge Function (`nlq-proxy/index.ts`)

Em vez de tentar adivinhar qual bloco e "o final", o proxy vai categorizar cada chunk do n8n em eventos tipados:

```text
n8n stream chunk → parse JSON → classificar:
  - type: "begin" com nodeName → emitir SSE: { type: "step", step: "Consultando banco de dados..." }
  - type: "item" com conteudo de tool → emitir SSE: { type: "step", step: "Analisando resultados..." }
  - type: "item" com texto final do agente → emitir SSE: { type: "token", token: "..." }
  - type: "end" → nao emitir nada
```

O proxy vai:
1. Mapear `nodeName` para labels amigaveis (ex: "Supabase Tool" → "Consultando dados...", "agente_negocio" → "Elaborando resposta...")
2. Emitir eventos `{ type: "step", step: "..." }` para etapas intermediarias — o frontend mostra como indicador visual
3. Emitir eventos `{ type: "token", token: "..." }` apenas para o texto final da resposta — o frontend renderiza progressivamente
4. Continuar acumulando o texto final para salvar no banco ao final

Regra de filtragem melhorada: tokens de texto so sao emitidos quando o proxy detecta o **ultimo bloco `begin` de `agente_negocio`** (o que gera a resposta final). Todos os blocos anteriores (tool calls, sub-agentes) geram apenas eventos de `step`.

### Mudanca no Frontend

#### 1. `useChatMessages.ts` — Novo campo `steps` no estado

Adicionar ao tipo `ChatMessage` um campo opcional `steps: string[]` e processar os novos eventos SSE:

```typescript
// Ao receber { type: "step", step: "..." }
→ Atualizar a mensagem otimista do assistente adicionando o step ao array

// Ao receber { type: "token", token: "..." }
→ Mesmo comportamento atual (acumular conteudo)
```

#### 2. `ChatMessage.tsx` — Renderizar steps durante streaming

Quando `status === 'streaming'` e `content` ainda esta vazio mas `steps` tem itens, mostrar os passos do agente com um visual tipo Lovable:

```text
┌──────────────────────────────────────┐
│ ✦ Consultando banco de dados...    ✓ │
│ ✦ Analisando resultados...         ✓ │
│ ● Elaborando resposta...           ⟳ │  ← step atual (animado)
└──────────────────────────────────────┘
```

- Steps concluidos: checkmark verde, texto em opacidade reduzida
- Step atual (ultimo): indicador pulsante, texto normal
- Quando tokens comecam a chegar, os steps colapsam com animacao e o texto da resposta aparece progressivamente

#### 3. `ThinkingBubble.tsx` — Substituido pelo novo componente de steps

O ThinkingBubble atual sera substituido pela visualizacao de steps dentro do proprio `ChatMessage`. Nao sera mais necessario como componente separado.

### Mapeamento de Nodes para Labels

| nodeName (n8n) | Label exibido |
|---|---|
| `Supabase Tool` / contendo "tool" | "Consultando banco de dados..." |
| `agente_negocio` (primeiro begin) | "Processando sua pergunta..." |
| `agente_negocio` (segundo begin) | "Elaborando resposta..." |
| Qualquer outro node | "Processando..." |

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/nlq-proxy/index.ts` | Emitir eventos SSE tipados (`step` e `token`) em vez de so `token` |
| `src/hooks/useChatMessages.ts` | Processar eventos `step`, adicionar campo `steps` ao estado |
| `src/components/chat/ChatMessage.tsx` | Renderizar steps durante streaming com visual de progresso |
| `src/components/chat/ThinkingBubble.tsx` | Refatorar para aceitar array de steps (ou remover) |

## Resultado Esperado

O usuario vera em tempo real:
1. "Consultando banco de dados..." (com check ao concluir)
2. "Analisando resultados..." (com check ao concluir)
3. "Elaborando resposta..." (pulsante)
4. Texto da resposta aparecendo token a token

Igual ao comportamento do Lovable ao processar uma tarefa.

