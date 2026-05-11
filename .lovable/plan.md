# Correção do timeout no chat ("A consulta excedeu o tempo limite")

## Diagnóstico (passo a passo)

A mensagem exata exibida no chat é:
> "A consulta excedeu o tempo limite. Tente reformular ou reduzir o período."

Essa string está **apenas** em um lugar do projeto: a função SQL `public.expire_stuck_processing_messages` (migration `20260429193647…`), executada por `pg_cron` a cada 1 minuto.

```sql
WHERE status = 'processing'
  AND processing_started_at < now() - interval '12 minutes';
```

Ou seja: o watchdog matou a `assistant_message` por ficar **mais de 12 min em `processing`**, sem nunca observar se o agente continuava ativo.

Por que disparou na pergunta "prossiga":
- A pergunta original ("faturamento atual + comparar com 10 primeiros dias dos últimos 3 meses + projeção de maio") explodiu em N iterações no n8n (vários `agente_consulta` + `agente_financeiro` + `agente_negocio`).
- Cada chamada de tool/Supabase/LLM custa segundos. A soma estourou 12 min.
- O cliente (`ASYNC_HARD_TIMEOUT_MS = 12min`) e o servidor (watchdog 12min) coincidem → não há margem nem heartbeat.
- Resultado: o n8n ainda estava trabalhando quando o watchdog marcou `error` e o usuário viu a mensagem.

Ponto crítico de design: o watchdog hoje **ignora** `updated_at`. Mesmo se o n8n estivesse fazendo progresso (escrevendo steps/conteúdo parcial), seria morto.

## Correções

### 1. Watchdog baseado em atividade (DB)
Migration nova alterando duas funções:

- `expire_stuck_processing_messages`: trocar a condição para
  `GREATEST(processing_started_at, updated_at) < now() - interval '15 minutes'`.
- `report_client_timeout`: mesma lógica + janela de 15 min.

Efeito: qualquer UPDATE feito pelo n8n (heartbeat, parcial, step) zera o relógio. Mensagens realmente travadas continuam sendo limpas.

### 2. Alinhar timeouts no cliente
`src/hooks/useChatMessages.ts`:
- `ASYNC_SOFT_TIMEOUT_MS`: 6min → 8min (aviso "demorando mais que o normal").
- `ASYNC_HARD_TIMEOUT_MS`: 12min → 15min (bate com o watchdog).

### 3. Mensagem de erro mais útil
Atualizar o texto do watchdog e do `report_client_timeout` para:
> "A consulta ficou sem resposta por muito tempo. Tente dividir em partes (ex.: peça um módulo ou um período por vez)."

E em `ChatMessage.tsx`, o subtítulo do estado de erro continua sugerindo reformular — manter consistente.

### 4. Recomendação para o n8n (fora do código, instrução ao agente)
Ajustar o system prompt do `agente_negocio` para, em planos com 3+ etapas:
- responder em **chunks** (atualizar a `chat_message` parcialmente via Supabase tool a cada etapa concluída) — isso ativa o heartbeat e impede o watchdog de matar.
- Quando o plano for muito grande, devolver primeiro a Visão Geral + Análise do mês atual e perguntar se quer continuar com a comparação histórica.

Essa parte não exige código no front, mas eu deixo a instrução pronta para colar no n8n.

## Arquivos afetados

- `supabase/migrations/<nova>.sql` — atualizar `expire_stuck_processing_messages` e `report_client_timeout`.
- `src/hooks/useChatMessages.ts` — bump dos dois timeouts.
- (opcional) Texto de erro centralizado.

## Verificação após aplicar

1. Conferir no SQL editor que as duas funções têm `GREATEST(...) < now() - interval '15 minutes'`.
2. Rodar `select cron.job` e confirmar que o job continua agendado.
3. Repetir o pedido "prossiga" no chat com a pergunta complexa; observar:
   - barra de steps continua avançando além de 6 min sem virar erro;
   - se chegar a 15 min sem qualquer UPDATE, o erro aparece com a nova mensagem.
