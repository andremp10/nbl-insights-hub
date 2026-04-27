# Plan: Streaming chatbot — limpeza definitiva (2026-04-27)

## Diagnóstico final

O `agente_negocio` (ReAct) re-emite traces como `Calling X with...` e `{"query":"SELECT..."}` dentro de `{"type":"item","content":"..."}` com `nodeName=agente_negocio`. Quando `{"output":"..."}` não é encontrado no buffer, o fallback acumulava esses traces + uma versão da resposta do sub-agente + a resposta final, todos colados.

## Correções aplicadas

1. **Nova função `extractLastCleanBlock(raw)`** em `nlq-proxy/index.ts`:
   - Localiza a posição final do ÚLTIMO marcador de ruído no buffer
   - Localiza a EARLIEST posição de marcador de resposta APÓS o ruído
   - Retorna o slice limpo, validado por `hasSafetyLeakage` e checagem de densidade JSON

2. **`deduplicateResponse` robusto**:
   - Coleta TODAS as posições de marcadores (`**Resumo**`, `_Períodos:`, `📊`)
   - Agrupa marcadores com gap ≤30 chars como mesmo bloco
   - Se há 2+ blocos distintos, mantém o último
   - Detecta marcadores mistos (📊 sub-agent + **Resumo** final)

3. **Pipeline de seleção de conteúdo (P1→P5)**:
   - P1: `canonicalOutput` capturado inline
   - P2: `extractFinalOutput(fullBuffer)` para `{"output":"..."}` ou `[{"output":"..."}]`
   - P3: `extractLastCleanBlock(finalAgentContent)` ← NOVO, substitui sanitize direto
   - P4: `extractLastCleanBlock(subAgentContent)` ← NOVO
   - P5: `extractLastCleanBlock(fullBuffer)` ← NOVO último recurso
   - Safety gate final: bloqueia qualquer leak residual

## Testes

48/48 passing em `supabase/functions/nlq-proxy/index.test.ts`, incluindo cenários reais com:
- Buffer com `Calling X` + SQL + 2 respostas concatenadas
- Sub-agent + final agent coexistindo
- Marcadores mistos (`📊` + `**Resumo**`)
- Períodos repetidos
- Apenas ruído → erro controlado

## Mensagens históricas poluídas

3 mensagens (`0f9a052f`, `8e62ff9e`, `afc93b6b`) permanecem com conteúdo corrompido pelo bug anterior. Não afetam novas respostas.
