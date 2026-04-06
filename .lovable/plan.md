
Diagnóstico

- O problema está no `supabase/functions/nlq-proxy/index.ts`, não no renderer do chat.
- Hoje o proxy envia `type:"token"` para qualquer `item.content` vindo de nós `agente*`.
- `isNoiseContent()` já existe, mas não está sendo aplicada no fluxo real.
- `detectStepsInText()` também lê texto cru do stream, então frases como `Calling agente_consulta...`, queries SQL e payloads internos acabam virando conteúdo visível.
- Quando `{"output":"..."}` não é encontrado, o fallback usa `streamedContent` bruto. É isso que está expondo logs internos e colando respostas duplicadas.

Plano

1. Trocar o proxy para modo “somente etapas até a resposta final”
- Parar de emitir tokens do n8n em tempo real durante os `item`.
- Durante a execução, enviar apenas `type:"step"` com os passos mascarados que vocês definiram.
- Manter `ping`/keepalive e o fluxo de recuperação já existente.

2. Reclassificar o stream em vez de confiar em “todo agente é conteúdo válido”
- Criar 3 categorias no parser:
  - nós de etapa: usados só para atualizar progresso amigável;
  - nós internos: `chat_historico`, `MCP_Client`, `tool`, `supabase`, `agente_consulta` e similares;
  - candidatos à resposta final: buffers acumulados internamente, sem nunca ir para a UI antes da hora.
- Remover a regra atual que libera qualquer node com `agente` no nome.

3. Parar de inferir etapas a partir do texto cru
- Remover a dependência de `detectStepsInText()` sobre conteúdo bruto.
- As etapas devem vir só de `begin/end` + mapeamento por `nodeName`/palavras-chave controladas.
- Assim o usuário verá apenas algo como:
```text
Analisando sua pergunta...
Consultando dados...
Processando resultados...
Elaborando resposta final...
```

4. Finalizar com uma seleção segura da resposta
- Ordem de escolha:
  1. `extractFinalOutput(fullBuffer)` como fonte principal;
  2. fallback sanitizado do melhor buffer candidato;
  3. se nada for seguro, retornar resposta controlada — nunca conteúdo bruto.
- Criar um sanitizador/selector para:
  - remover prefixos `Calling ...`, SQL, JSON técnico e traces internos;
  - detectar o início de resposta real (`_Períodos:`, `**Resumo**`, `📊`, headings, tabelas markdown);
  - escolher o melhor bloco final e evitar conteúdo duplicado.

5. Só liberar conteúdo quando o output estiver pronto
- O proxy deve acumular tudo internamente e só enviar a resposta para o frontend no `finalize()`.
- Pode reutilizar o frontend atual enviando:
  - um único `token` com a resposta limpa inteira, ou
  - lotes pequenos apenas depois que a resposta final estiver definida.
- Só depois disso enviar `type:"done"` e `[DONE]`.

6. Blindagem para “nunca mais acontecer”
- Adicionar testes do parser do `nlq-proxy` cobrindo:
  - stream com `{"output":"..."}`;
  - stream apenas com `item.content`;
  - stream com `Calling ...`, SQL e JSON técnico;
  - stream com duas respostas concatenadas;
  - chunk quebrado no meio do JSON.
- Regra de segurança: se o fallback ainda contiver marcadores internos, bloquear e devolver erro controlado em vez de vazar logs.

Arquivos impactados

- `supabase/functions/nlq-proxy/index.ts` — correção principal do parser, masking dos steps e finalização segura.
- `src/hooks/useChatMessages.ts` — ajuste opcional se eu preferir introduzir um evento final dedicado; se eu mantiver `token` final único, praticamente não precisa mudar.
- `supabase/functions/nlq-proxy/*.test.ts` — testes de regressão do parser.

Resultado esperado

- Durante o processamento: apenas etapas mascaradas.
- Nenhum `Calling ...`, SQL, prompt interno ou log técnico aparecendo no chat.
- No fim: uma única resposta limpa, formatada e sem repetição.
- Se o `output` final não vier: fallback seguro ou erro controlado, nunca conteúdo feio/bruto.
