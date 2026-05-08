## Objetivo

Tornar os passos exibidos no chat (componente `AgentSteps`) mais precisos e fiéis ao que o agente está realmente executando, em vez dos rótulos genéricos atuais ("Consultando dados...", "Acessando banco de dados...", "Elaborando resposta...").

## Diagnóstico

Os steps são emitidos pelo proxy `supabase/functions/nlq-proxy/index.ts` (função `nodeToStepLabel`, linhas 46–56 e `emitStep` ao longo do stream) e renderizados por `src/components/chat/AgentSteps.tsx`. Hoje:

- O label inicial fixo é "Enfileirando consulta…" / "Conectando ao agente…" (vindo de `useChatMessages.ts`).
- O proxy emite no máximo 4–5 rótulos genéricos, sem distinguir entre interpretação, escolha de view, consulta SQL e síntese.
- Não há diferenciação entre "sub-agente de pedidos" e "sub-agente financeiro" no texto exibido — ambos viram "Consultando dados...".
- Step "Acessando banco de dados..." é emitido para qualquer nó Supabase/Tool/MCP, gerando ruído repetitivo.

## Mudanças propostas

### 1. Novo conjunto de labels (proxy `nlq-proxy/index.ts`)

Substituir `nodeToStepLabel` por uma máquina de estados mais granular, com estes passos canônicos e em ordem natural:

```text
1. Interpretando a pergunta
2. Identificando o módulo (Pedidos | Financeiro | Misto)
3. Consultando vw_dashboard_pedidos        (se sub-agente de pedidos)
3'. Consultando vw_dashboard_financeiro    (se sub-agente financeiro)
4. Cruzando resultados                     (quando ambos sub-agentes rodam)
5. Analisando dados
6. Gerando insights
7. Formatando resposta
```

Mapeamento por nó do n8n:
- `agente_negocio` (1ª `begin`) → "Interpretando a pergunta"
- `switch`/`if` no início (primeiro nó de roteamento) → "Identificando o módulo" (novo: hoje é tratado como `internal` e ignorado; permitir 1 emissão única)
- `agente_consulta` `begin` → "Consultando pedidos (vw_dashboard_pedidos)"
- `agente_financeiro` `begin` → "Consultando financeiro (vw_dashboard_financeiro)"
- Quando `agentBeginCount >= 2` em `agente_negocio` → "Analisando dados" (em vez de "Elaborando resposta...")
- Captura do `{"output":"..."}` → "Gerando insights"
- `finalize()` → "Formatando resposta" (em vez de "Elaborando resposta final...")

Remover/silenciar:
- "Acessando banco de dados..." (atual gatilho `supabase|tool|mcp`) → não emitir como step próprio; vira parte implícita do passo de consulta do sub-agente correspondente.
- "Consultando dados..." fixo emitido em `emitStep('Consultando dados...')` antes do stream — remover, deixando apenas os passos reais derivados dos eventos.

### 2. Labels iniciais no front (`src/hooks/useChatMessages.ts`)

- Trocar `'Enfileirando consulta…'` → `'Preparando consulta'`
- Trocar `'Aguardando agente…'` / `'Conectando ao agente…'` → `'Conectando ao agente'`
- Trocar `'Aguardando resposta do agente...'` (fallback de timeout) → `'Aguardando resposta…'`
- Padronizar: sem reticências unicode "…" em alguns e "..." em outros — usar sempre sem reticências (estilo terminal/B2B já adotado).

### 3. Ordem e deduplicação

A `emittedSteps: Set<string>` atual garante unicidade por label exato. Como agora os labels de sub-agente são distintos (pedidos vs financeiro), a deduplicação continua válida e ambos podem aparecer na mesma sessão quando aplicável. Manter o `Set`.

### 4. Componente `AgentSteps.tsx`

Sem mudanças visuais. Apenas se beneficia dos labels novos, mais curtos e específicos. Manter:
- Cronômetro total e por step
- Estado "Concluído em Xs · N etapas" colapsado
- Animação ping no step ativo

## Arquivos a editar

- `supabase/functions/nlq-proxy/index.ts` — função `nodeToStepLabel`, classificação de switch/if como roteamento (1 vez), remover `emitStep('Consultando dados...')` e `emitStep('Elaborando resposta final...')`, trocar para os novos labels.
- `src/hooks/useChatMessages.ts` — strings iniciais nas linhas ~292, ~300, ~396, ~548, ~566.

## Fora de escopo

- Prompt do agente n8n (não tocar).
- Visual/CSS do componente de steps.
- Lógica de timeout/keepalive.

## Validação

Após deploy:
1. Fazer pergunta só de pedidos → ver "Interpretando a pergunta → Identificando módulo → Consultando pedidos → Analisando dados → Gerando insights → Formatando resposta".
2. Pergunta financeira → idem com "Consultando financeiro".
3. Pergunta cruzada → ver ambos sub-agentes.
4. Confirmar que não aparece mais "Acessando banco de dados..." nem "Consultando dados..." genérico.
