

# Plano — Filtragem Robusta do Stream + UX de Steps Aprimorada

## Problema

O texto "Calling agente_consulta with input: {...}" está vazando para o usuário porque a lógica `inFinalAgentBlock` no proxy não filtra conteúdo intermediário do agente (tool calls, thinking, JSON de input). Além disso, os indicadores de steps são básicos e não mostram tempo decorrido.

## Mudanças

### 1. Edge Function (`supabase/functions/nlq-proxy/index.ts`)

**Filtragem de conteúdo intermediário**: Antes de emitir qualquer token, verificar se o conteúdo é "lixo interno" do agente:

```typescript
function isInternalAgentNoise(text: string): boolean {
  const t = text.trim();
  if (/^Calling \w+ with input:/i.test(t)) return true;
  if (/^```json\s*\{/.test(t)) return true;      // JSON blocks from tool calls
  if (/^\{"Prompt_|^\{"tool_/i.test(t)) return true; // raw tool payloads
  if (/^Thought:|^Action:|^Observation:/i.test(t)) return true; // ReAct traces
  if (t.startsWith('{') && t.includes('"Batch_Size"')) return true;
  return false;
}
```

Aplicar este filtro em TODOS os tokens antes de emitir — mesmo dentro do "final agent block". Isso é mais robusto do que confiar apenas na contagem de blocos.

**Mapeamento expandido de nodes para steps**: Adicionar `agente_consulta` e outros sub-agentes como steps amigáveis:

| nodeName | Label |
|---|---|
| `agente_consulta` | "Consultando dados de pedidos..." |
| `agente_financeiro` | "Consultando dados financeiros..." |
| Contém `supabase` ou `tool` | "Acessando banco de dados..." |
| `agente_negocio` (1o begin) | "Analisando sua pergunta..." |
| `agente_negocio` (2o+ begin) | "Elaborando resposta..." |
| Qualquer outro | "Processando..." |

**Emit step para sub-agentes**: Quando detectar "Calling agente_consulta" no conteúdo (filtrado do output), emitir um step adicional como "Consultando dados de pedidos...".

### 2. Frontend — `useChatMessages.ts`

- Adicionar campo `startedAt: number` na mensagem otimista do assistente (timestamp de quando começou o streaming)
- Já tem `steps` — sem mudança estrutural necessária

### 3. Frontend — `AgentSteps.tsx` (redesign completo)

Novo componente com:

- **Timer em tempo real**: Exibir "12s" ao lado do step atual, atualizado a cada segundo via `useEffect` + `setInterval`
- **Visual melhorado**:
  - Steps concluídos: ícone check verde, texto com opacidade reduzida (sem line-through que polui)
  - Step atual: dot pulsante laranja (primary), texto normal, timer ao lado
  - Animação de entrada suave para cada novo step (`animate-in`)
- **Suporte a esperas longas**: Se o timer do step atual passar de 30s, mostrar texto extra sutil: "Isso pode levar alguns instantes..."
- **Tempo total**: Ao completar, mostrar tempo total de processamento: "Concluído em 45s"

```text
┌────────────────────────────────────────────────┐
│  ✓  Analisando sua pergunta...            2s   │
│  ✓  Consultando dados de pedidos...       8s   │
│  ●  Elaborando resposta...               14s   │  ← pulsante
│     Isso pode levar alguns instantes...        │  ← só aparece se > 30s
└────────────────────────────────────────────────┘
```

### 4. Frontend — `ChatMessage.tsx`

- Passar `startedAt` para `AgentSteps`
- Manter steps visíveis mesmo quando content começa a chegar (durante streaming), colapsando só quando `status === 'complete'`
- Mostrar "Concluído em Xs" após finalizar

### 5. Timeout e resiliência (`useChatMessages.ts`)

- Aumentar `STREAM_TIMEOUT_MS` de 2min para 5min (consultas complexas podem demorar)
- Adicionar keepalive no edge function: emitir `data: {"type":"ping"}\n\n` a cada 15s se nenhum evento foi enviado (evita timeout de proxy/CDN)

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/nlq-proxy/index.ts` | Filtro `isInternalAgentNoise`, mapeamento expandido de nodes, keepalive ping |
| `src/hooks/useChatMessages.ts` | Campo `startedAt`, timeout 5min, ignorar eventos `ping` |
| `src/components/chat/AgentSteps.tsx` | Redesign com timer, visual melhorado, msg de espera longa |
| `src/components/chat/ChatMessage.tsx` | Passar `startedAt`, manter steps durante streaming, tempo total |

