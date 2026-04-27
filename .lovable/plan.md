

## Diagnóstico final — raiz do problema

Analisei o código atual (`nlq-proxy/index.ts`), as mensagens persistidas no banco, e o pipeline frontend. O cenário é:

### O que acontece no n8n

O `agente_negocio` é um agente ReAct. Quando ele "pensa", o n8n emite seus traces como `{"type":"item","content":"Calling agente_consulta with...","metadata":{"nodeName":"agente_negocio"}}`. Ou seja, o conteúdo de tool calls vem DENTRO de items do nó final.

Além disso, o `agente_negocio` recebe a resposta do sub-agente como "Observation" e pode re-emitir esse texto. Resultado: `finalAgentContent` acumula:

```text
Calling agente_consulta with input: {...}    ← ReAct trace
Calling MCP_Client with input: {...}         ← ReAct trace  
📊 Resumo [resposta do sub-agente]           ← Observation (duplicada)
_Períodos:_ **Resumo** [resposta final]      ← Resposta real
```

### Por que o código atual falha

1. **Quando `{"output":"..."}` existe**: P1/P2 funciona — a mensagem de 17:41 do dia 06/04 saiu limpa
2. **Quando `{"output":"..."}` NÃO existe**: Cai no P3 (`sanitizeFallbackContent(finalAgentContent)`)
   - O sanitizador encontra `📊` como primeiro marcador de resposta e corta o prefixo "Calling..."
   - Mas o texto resultante contém DUAS respostas (sub-agente + final) coladas
   - `deduplicateResponse` não detecta porque os marcadores são diferentes (`📊 Resumo` vs `**Resumo**`)
   - Resultado: ambas as respostas são persistidas concatenadas

3. **Quando o stream vem como texto puro** (sem JSON): As linhas "Calling..." falham no `JSON.parse`, não vão para nenhum buffer de conteúdo, mas `fullBuffer` fica poluído. Se `extractFinalOutput` falha, não há fallback.

### Falhas específicas na deduplicação

- `deduplicateResponse` só detecta `**Resumo**` repetido (com asteriscos) ou `📊` repetido
- Não detecta `📊 Resumo` (sem bold) + `**Resumo**` (com bold) como duplicata
- Não detecta `_Períodos:` repetido como sinal de dois blocos

---

## Plano de correção

### 1. Adicionar filtragem de conteúdo durante acumulação do `finalAgentContent`

Mesmo que tokens cheguem caractere a caractere, podemos detectar padrões no buffer acumulado periodicamente. A cada item do `agente_negocio`:

- Após acumular, verificar se `finalAgentContent` termina com padrão de noise (`Calling `, `Thought:`, `Action:`, etc.)
- Se sim, marcar um "reset point" — tudo antes é descartável
- No final, usar apenas o conteúdo APÓS o último reset point

### 2. Reescrever `extractLastCleanBlock()` (nova função)

Substitui o uso direto de `sanitizeFallbackContent` no P3/P4:

```text
extractLastCleanBlock(text):
  1. Encontrar TODAS as posições de marcadores de ruído
  2. Encontrar TODAS as posições de marcadores de resposta real
  3. Pegar o ÚLTIMO marcador de resposta que vem DEPOIS do ÚLTIMO ruído
  4. Retornar o texto a partir desse ponto
  5. Se ainda tem ruído → retornar null
```

### 3. Melhorar `deduplicateResponse()`

Adicionar detecção de:
- `_Períodos:` ou `_Período:` repetido (2+ ocorrências)
- Bloco de tabela repetido (2+ separadores `|---|`)
- Marcadores mistos (`📊` + `**Resumo**` como indicador de 2 blocos)
- Heurística de tamanho: se o conteúdo tem >2000 chars e contém 2+ blocos de resposta estruturada, manter o último

### 4. Endurecer `hasSafetyLeakage()` 

Adicionar padrões:
- `Calling \w+ with input:` (sem `^`, para pegar no meio do texto)
- `Batch_Size` e `Prompt__User_Message_` fora de JSON
- Detecção de resposta duplicada como sinal de leak

### 5. Limpeza de mensagens históricas poluídas

Executar um UPDATE nas 3 mensagens com leak já identificadas:
- `0f9a052f` (Calling chat_historico...)
- `8e62ff9e` (to=multi_tool_use...)
- `afc93b6b` ({"type":"begin"...})

Aplicar `sanitizeFallbackContent` nelas ou marcar como error.

---

## Detalhes técnicos

### Arquivo: `supabase/functions/nlq-proxy/index.ts`

Mudanças:
- Nova função `extractLastCleanBlock(text)` entre Layer 6 e Layer 7
- Refatorar P3/P4 no priority chain para usar `extractLastCleanBlock` → `deduplicateResponse` → `hasSafetyLeakage`
- Melhorar `deduplicateResponse` com novos padrões
- Adicionar noise tracking durante acumulação de `finalAgentContent`

### Arquivo: `supabase/functions/nlq-proxy/index.test.ts`

Novos testes:
- `finalAgentContent` com ReAct traces + 2 respostas → extrai só a última
- Marcadores mistos (`📊` + `**Resumo**`) detectados como duplicata
- `_Períodos:` repetido → dedup funciona
- Fallback ainda ruidoso → erro controlado (nunca conteúdo bruto)

### Resultado esperado

- Durante processamento: apenas steps mascarados
- No final: uma única resposta limpa
- Se `{"output":"..."}` chega: usa direto (já funciona)
- Se NÃO chega: extrai o último bloco limpo do `finalAgentContent`, deduplicado e validado
- Se nada é seguro: erro controlado, nunca lixo

