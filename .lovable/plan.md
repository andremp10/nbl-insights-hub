

# Plano — Reescrever Parsing do Stream (Formato Real) + Suporte a Consultas Longas

## Problema Raiz (Descoberta Critica)

O proxy `nlq-proxy` espera chunks JSON estruturados com `{"type":"begin",...}` / `{"type":"item",...}` / `{"type":"end",...}`, mas o n8n **NAO envia nesse formato**. O stream do n8n e **texto plano** (raw text chunks), nao JSON-por-linha.

Prova: a mensagem salva no banco contem TUDO junto — tool calls, "Calling agente_consulta", respostas intermediarias E o JSON `{"output":"..."}` final — porque nenhum parsing JSON funcionou e o conteudo caiu direto no buffer sem filtragem.

### Anatomia real de um stream do n8n (texto plano):

```text
Chunk 1: "to=multi_tool_use.parallel  北京赛车如何json\n{\"tool_uses\":[...]}"
Chunk 2: "Calling agente_consulta with input: {\"Prompt__User_Message_\":\"...\",\"Batch_Size\":20}"
Chunk 3: "📊 **Resumo**\nNo período de..." (resposta intermediaria do sub-agente)
Chunk 4: "_Períodos: 01/04/2026..." (resposta FINAL formatada pelo agente_negocio)
Chunk 5: "{\"output\":\"_Períodos: 01/04/2026...\"}" (JSON wrapper final do Respond to Webhook)
```

Nao ha `\n`-delimited JSON. Sao chunks de texto bruto concatenados.

## Solucao: Reescrever o Parser Completamente

### 1. Edge Function (`nlq-proxy/index.ts`) — Parser baseado em texto

Em vez de tentar parsear JSON por linha, tratar o stream como **texto bruto acumulado** e aplicar filtragem baseada em padroes de texto:

**Logica principal:**

```text
acumular chunks de texto em um buffer global
a cada chunk recebido:
  1. Verificar se o buffer contem {"output":"..."} → extrair como resposta final
  2. Detectar padroes de step no texto novo:
     - "Calling agente_consulta" → emitir step "Consultando dados de pedidos..."
     - "Calling agente_financeiro" → emitir step "Consultando dados financeiros..."
     - "to=multi_tool_use" → emitir step "Analisando sua pergunta..."
     - Emoji 📊/📋/🧠 no inicio → emitir step "Processando resultados..."
  3. NAO emitir nenhum token de texto durante o processamento
  4. Ao final (stream done): extrair o conteudo do {"output":"..."} e emitir como tokens
  5. Se nao houver {"output":"..."}, usar heuristica para extrair a ultima resposta limpa
```

**Estrategia de resposta final:**
- O n8n sempre termina com `{"output":"...conteudo limpo..."}` — esse e o unico conteudo que deve ser exibido ao usuario
- Se por algum motivo esse JSON nao aparecer, pegar o texto apos o ultimo padrao de "noise" como fallback

**Emissao de tokens:** Ao inves de streaming token-a-token (que mostraria lixo), fazer:
- Durante processamento: emitir apenas eventos `step`
- Ao receber o `{"output":"..."}` final: emitir o conteudo limpo em chunks de ~50 chars para simular streaming rapido

**Keepalive:** Manter ping a cada 15s (ja implementado, funciona).

### 2. Padroes de deteccao de steps (expandido)

```text
Texto detectado                          → Step emitido
─────────────────────────────────────────────────────────
"to=multi_tool_use"                      → "Analisando sua pergunta..."
"Calling agente_consulta"                → "Consultando dados de pedidos..."
"Calling agente_financeiro"              → "Consultando dados financeiros..."
"Calling" + qualquer nome               → "Consultando dados..."
"functions.Think"                        → (nenhum step, e interno)
"functions.chat_historico"               → "Verificando historico..."
Emoji no inicio (📊📋🧠💡)              → "Processando resultados..."
{"output":"..."}                         → "Elaborando resposta final..."
```

### 3. Suporte a consultas longas (4-5 min)

**Edge Function timeout:** Supabase Edge Functions tem limite de 150s (free) ou 400s (paid). Para consultas de 4-5 min (240-300s), precisamos:

- Verificar que o plano Supabase suporta 400s de wall-clock (paid plan)
- Adicionar `wall_clock_timeout` no `config.toml` se disponivel
- O keepalive de 15s ja previne timeout de proxy/CDN intermediario
- O frontend ja tem timeout de 5 min (300s) — OK

**Se o edge function timeout for menor que o tempo da consulta:**
Nao ha como contornar isso sem mudar a arquitetura (ex: n8n escrever direto no banco). Mas com o keepalive + paid plan (400s), a maioria das consultas de 4-5 min devem funcionar.

### 4. Frontend — Sem mudancas estruturais

O `useChatMessages.ts` e `AgentSteps.tsx` ja estao corretos para receber `step` e `token` events. O problema era 100% no backend (parser errado).

Unica melhoria: quando o conteudo final chega de uma vez (nao token-a-token), garantir que o status mude para `complete` corretamente — ja implementado.

### 5. Salvamento no banco

Corrigir: atualmente o proxy salva TUDO (incluindo noise) como conteudo da mensagem. Com a nova logica:
- Salvar APENAS o conteudo extraido de `{"output":"..."}` 
- Se nao houver output JSON, salvar o texto limpo apos filtragem

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/nlq-proxy/index.ts` | Reescrever parser: texto bruto → deteccao de steps + extracao de output JSON final |
| `supabase/config.toml` | Verificar/adicionar configuracao de timeout se necessario |

Frontend (`useChatMessages.ts`, `AgentSteps.tsx`, `ChatMessage.tsx`) — **sem mudancas**, ja estao preparados para o formato de eventos.

## Resultado Esperado

```text
Usuario envia: "Qual o faturamento de marco?"

1. [0s]  ● Analisando sua pergunta...          3s  ← detectado "to=multi_tool_use"
2. [3s]  ✓ Analisando sua pergunta...          3s
         ● Consultando dados de pedidos...     45s  ← detectado "Calling agente_consulta"
3. [48s] ✓ Consultando dados de pedidos...     45s
         ● Processando resultados...           12s  ← detectado emoji 📊
4. [60s] ✓ Processando resultados...           12s
         ● Elaborando resposta final...         5s  ← detectado {"output":"..."}
5. [65s] Texto da resposta aparece (limpo, sem noise)
         Concluido em 1m 5s
```

