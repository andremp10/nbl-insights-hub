

# Plano: Reestruturar Chamada do Agente via Edge Function

## Problema Identificado

O `useChatbot.ts` chama o webhook do n8n **diretamente do navegador** do usuario. Isso causa:

1. **Bloqueio por CORS** — o navegador bloqueia a requisicao cross-origin ao Railway, resultando em erro imediato
2. **Timeout de 60s muito curto** — o agente n8n pode demorar mais que 60s para processar queries complexas (consultar banco, gerar resposta)
3. **Edge Function existente nao esta sendo usada** — ja existe `supabase/functions/nlq-proxy/index.ts` com logica correta mas o frontend ignora ela
4. **Config.toml incompleto** — falta `verify_jwt = false` para permitir chamadas a Edge Function

## Solucao

Redirecionar todas as chamadas do chat para passar pela Edge Function `nlq-proxy`, que:
- Roda server-side (sem CORS)
- Tem timeout de 150s (suficiente para o agente)
- Normaliza a resposta antes de devolver ao frontend

## Mudancas

### 1. `supabase/config.toml`
Adicionar configuracao da Edge Function:

```toml
project_id = "bcypejzqbcwibvtbbfor"

[functions.nlq-proxy]
verify_jwt = false
```

### 2. `src/hooks/useChatbot.ts`
Substituir `fetch` direto ao Railway por `supabase.functions.invoke('nlq-proxy')`:

- Importar o client Supabase
- Remover a constante `WEBHOOK_URL`
- Trocar o `fetch` por `supabase.functions.invoke('nlq-proxy', { body: payload })`
- Aumentar timeout do frontend para 180s (acima dos 150s da Edge Function, para que o timeout server-side seja o que controla)
- A Edge Function ja normaliza a resposta no formato `{ ok, reply, error }` — o frontend so precisa ler esse contrato
- Tratar `ok: false` como erro com mensagem amigavel do campo `error.message`

Logica simplificada:

```text
1. Usuario envia mensagem
2. Frontend chama supabase.functions.invoke('nlq-proxy', { body })
3. Edge Function recebe, faz fetch ao n8n (150s timeout server-side)
4. Edge Function normaliza resposta e retorna { ok, reply }
5. Frontend le reply.text e exibe
6. Se ok=false, exibe error.message com botao retry
```

### 3. `supabase/functions/nlq-proxy/index.ts`
A Edge Function ja esta funcional. Apenas ajustar:
- Verificar que o webhook URL esta correto (ja esta: `https://primary-production-c00b.up.railway.app/webhook/...`)
- Re-deploy automatico apos alteracao no config.toml

## Beneficios

- **Sem CORS**: Edge Function roda server-side
- **Timeout adequado**: 150s no servidor, o agente tem tempo de responder
- **Resposta garantida**: o usuario sempre recebe uma mensagem (sucesso ou erro estruturado)
- **Seguranca**: webhook URL fica no servidor, nao exposta no bundle do frontend

## Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| `supabase/config.toml` | Adicionar `[functions.nlq-proxy]` |
| `src/hooks/useChatbot.ts` | Trocar fetch direto por `supabase.functions.invoke` |
| `supabase/functions/nlq-proxy/index.ts` | Sem mudanca (re-deploy automatico) |

