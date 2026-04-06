

# Plano — Ajuste do Streaming entre n8n e Edge Function

## Problema Identificado

O fluxo atual no n8n e:
```text
Webhook → agente_negocio → Edit Fields → Respond to Webhook
```

O node **Edit Fields** entre o agente e o "Respond to Webhook" **quebra o streaming**. Ele espera o output completo do agente para mapear os campos (`pending_message_id` e `output`), e so entao passa para o "Respond to Webhook". Isso significa que o n8n nao envia tokens em tempo real — ele bufferiza tudo e envia de uma vez.

## O que precisa mudar no n8n

### Remover o node Edit Fields

Para streaming real (token a token do LLM), o fluxo deve ser:

```text
Webhook → agente_negocio → Respond to Webhook (streaming habilitado)
```

O "Respond to Webhook" deve receber diretamente a saida do agente, sem intermediarios.

### O `pending_message_id` nao e mais necessario

Na arquitetura nova, **a Edge Function (`nlq-proxy`) ja salva a mensagem do assistente no Supabase** ao final do stream (linhas 154-159 do codigo atual). O n8n nao precisa salvar nada no banco. Ele so precisa responder com o texto do agente.

Portanto:
- **Remover** o node Edit Fields
- **Remover** qualquer logica no n8n que salve no Supabase via `pending_message_id`
- O n8n so precisa: receber a pergunta, processar no agente, e devolver o texto via streaming

## O que precisa mudar no codigo (Edge Function)

O codigo atual da `nlq-proxy` ja esta correto para este cenario. Porem, o formato do stream vindo do n8n com "Respond to Webhook" pode ser **texto puro** (nao SSE formatado). O codigo atual ja lida com isso — ele le chunks brutos e os repassa como SSE para o frontend.

Ha um ajuste necessario: o n8n com streaming pode enviar o output como texto plano em chunks (sem `data:` prefix). O codigo atual na linha 147-151 ja trata isso corretamente — acumula o chunk e repassa como `data: {"token": "..."}\n\n`.

### Unico ajuste no codigo

Nenhuma mudanca de codigo e necessaria. A Edge Function e o frontend ja estao preparados para:
1. Receber chunks de texto puro do n8n
2. Repassar como SSE ao frontend
3. Acumular e salvar a mensagem completa no Supabase ao final

## Resumo de acoes

| Onde | Acao |
|------|------|
| **n8n** | Remover o node "Edit Fields" — conectar `agente_negocio` direto ao `Respond to Webhook` |
| **n8n** | Garantir que "Respond to Webhook" esta com streaming habilitado |
| **n8n** | Remover qualquer logica que salve no Supabase via `pending_message_id` (o Edge Function ja faz isso) |
| **Codigo** | Nenhuma mudanca necessaria — `nlq-proxy` e frontend ja estao corretos |

## Passo a passo no n8n

1. Abra o workflow `nbl_agente`
2. Delete o node **Edit Fields**
3. Conecte a saida do **agente_negocio** diretamente ao **Respond to Webhook**
4. No node **Respond to Webhook**, confirme que a opcao de streaming esta habilitada
5. Publique o workflow
6. Teste enviando uma mensagem no chat — os tokens devem aparecer progressivamente

