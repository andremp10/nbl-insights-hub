
Objetivo

- Blindar o streaming para que o chat mostre apenas etapas mascaradas durante a execução e persista/exiba uma única resposta final limpa.

Diagnóstico confirmado

- Há mensagens contaminadas já gravadas em `chat_messages`; 3 de 69 respostas recentes ainda têm `Calling ...`, JSON bruto ou traces internos.
- O caso mais claro concatena logs técnicos + uma resposta parcial + uma segunda resposta final no mesmo conteúdo persistido.
- A arquitetura atual ainda falha em 4 pontos:
  1. `classifyNode()` em `nlq-proxy` trata qualquer nó com `agente` como `final_agent`.
  2. `extractFinalOutput()` é frágil e pode perder wrappers reais como arrays/objetos com espaços (`[ { "output": ... } ]`).
  3. O parser lê apenas linhas JSON puras; se o n8n vier em SSE (`data:`), arrays, objetos parciais ou chunks quebrados, ele ignora o evento certo e cai no fallback.
  4. `sanitizeFallbackContent()` ainda pode deixar respostas duplicadas ou escolher o bloco errado.

Plano

1. Reestruturar o parser do `nlq-proxy` em camadas
- Separar claramente: normalização de chunks -> classificação de eventos -> coleta privada de candidatos -> seleção final -> validação de segurança.
- Isso elimina a mistura atual entre parsing, steps e fallback.

2. Trocar heurística aberta por allowlist estrita
- Remover a regra `if (lower.includes('agente')) return 'final_agent'`.
- Definir explicitamente:
  - `internal`: webhook, MCP, tools, histórico, supabase, traces técnicos
  - `sub_agent`: agentes auxiliares, nunca exibidos
  - `final_agent`: apenas nós finais conhecidos/permitidos
- Qualquer nó desconhecido passa a ser ignorado, não promovido a resposta final.

3. Tornar a captura do output determinística
- Criar um extrator robusto para:
  - `{"output":"..."}`
  - `[{"output":"..."}]`
  - objetos com espaços/quebras
  - eventos SSE `data: ...`
- Se chegar um `obj.output` no stream, guardar isso como candidato canônico imediatamente.

4. Endurecer o fallback
- Manter buffers separados por origem:
  - `canonicalOutput`
  - `finalAgentCandidate`
  - `subAgentCandidate`
- Antes de usar fallback, aplicar:
  - remoção de prefixos técnicos (`Calling`, SQL, JSON, traces)
  - divisão de blocos repetidos
  - escolha do melhor bloco por score de resposta útil/markdown
- Se ainda houver ruído, falhar fechado com erro controlado; nunca persistir conteúdo bruto.

5. Blindar persistência e emissão
- Só persistir/enviar ao front conteúdo aprovado por uma função final de segurança.
- Se o texto final contiver marcadores de vazamento (`Calling`, `SELECT`, `{"type":`, `to=multi_tool_use`, `MCP_Client`), bloquear a resposta e retornar erro amigável.
- Durante a execução, continuar enviando apenas `step` + `ping`.
- Só no `finalize()` emitir a resposta final limpa.

6. Melhorar a deduplicação de respostas
- Detectar quando o stream traz duas versões da resposta no mesmo buffer.
- Manter apenas o bloco final canônico ou o último bloco limpo válido.
- Evitar concatenar “resumo 1 + resposta final 2” no mesmo conteúdo persistido.

7. Reforçar testes de regressão
- Cobrir em `supabase/functions/nlq-proxy/index.test.ts`:
  - wrapper simples `{"output":...}`
  - wrapper em array `[{"output":...}]`
  - SSE com `data:`
  - chunks quebrados no meio do JSON
  - subagente com `Calling ...` + resposta válida
  - resposta duplicada no mesmo buffer
  - nó desconhecido com “agente” no nome
  - fallback ainda ruidoso -> erro controlado

8. Verificação após implementação
- Reexecutar os casos reais que hoje quebram.
- Conferir dois pontos:
  - no chat: apenas steps mascarados até o fim
  - no banco: nenhuma nova linha em `chat_messages` com `Calling`, `{"type":`, SQL ou traces internos
- Opcional: limpar mensagens históricas já poluídas para não manter sessões antigas “feias”.

Detalhes técnicos

- Arquivos principais: `supabase/functions/nlq-proxy/index.ts`, `supabase/functions/nlq-proxy/index.test.ts`
- Ajuste pequeno opcional no front: `src/hooks/useChatMessages.ts` apenas se eu precisar distinguir “final pronto” de “token final em lote”; a maior correção está no proxy.
- Não precisa migration de banco.

Fluxo alvo

```text
n8n stream
-> normalizar eventos reais (JSON / SSE / chunks)
-> classificar por allowlist
-> acumular candidatos privados
-> escolher 1 resposta final segura
-> validar contra vazamento
-> persistir + emitir resposta final
```

Resultado esperado

- Nenhum pensamento literal, tool call ou SQL no chat.
- Nenhuma resposta duplicada.
- Steps mascarados durante o processamento.
- Apenas uma resposta final limpa, consistente e persistida com segurança.
