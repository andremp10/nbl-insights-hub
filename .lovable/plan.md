

# Plano — Isolamento de Sessoes por Usuario no Chat

## Problemas Identificados

### 1. Edge Function sem validacao de usuario (CRITICO)
A `nlq-proxy` usa `SERVICE_ROLE_KEY` (bypassa RLS) e **nao valida quem esta chamando**. Qualquer usuario autenticado pode enviar mensagens para qualquer `session_id`, incluindo sessoes de outros usuarios.

### 2. Realtime sem filtragem por usuario
O canal Realtime em `useChatMessages` escuta `session_id=eq.${sessionId}` — o RLS do Supabase protege no SELECT, mas o canal nao filtra por `user_id`. Na pratica, o RLS ja impede que o usuario veja mensagens de sessoes que nao sao dele, entao isso funciona corretamente.

### 3. Sessoes: OK
O `useChatSessions` ja filtra por `user_id = auth.uid()` tanto no fetch quanto no Realtime. RLS tambem protege. Isso esta correto.

### 4. Deduplicacao sem escopo de usuario
A checagem de idempotencia na Edge Function busca por `session_id + content + janela de 10s`, mas como usa `SERVICE_ROLE_KEY`, poderia teoricamente colidir entre usuarios com o mesmo conteudo na mesma sessao (improvavel, mas incorreto).

## Solucao

### Arquivo: `supabase/functions/nlq-proxy/index.ts`

Adicionar validacao JWT no inicio da funcao:

1. Extrair o token do header `Authorization`
2. Usar `supabase.auth.getUser(token)` para obter o `user_id`
3. Verificar que o `session_id` enviado pertence ao usuario autenticado (query em `chat_sessions` onde `id = session_id AND user_id = auth_user_id`)
4. Se nao pertencer, retornar 403

Isso garante que:
- Usuario A nao pode enviar mensagens na sessao do Usuario B
- As mensagens inseridas via `SERVICE_ROLE_KEY` sao sempre para sessoes validas do usuario

```text
Fluxo corrigido:

Frontend (com JWT) ──POST──▶ nlq-proxy
                                │
                                ├─ Valida JWT → obtem user_id
                                ├─ Verifica session_id pertence ao user_id
                                ├─ Insere user msg
                                ├─ Chama n8n (stream)
                                └─ Insere assistant msg ao final
```

### Mudancas especificas

**`supabase/functions/nlq-proxy/index.ts`** — Adicionar ~15 linhas no inicio:

```typescript
// Apos o parse do body:
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
}

const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
});
const { data: claims, error: claimsErr } = await userClient.auth.getUser();
if (claimsErr || !claims.user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
}

const userId = claims.user.id;

// Verificar ownership da sessao
const { data: sessionOwner } = await supabase
  .from('chat_sessions')
  .select('user_id')
  .eq('id', session_id)
  .single();

if (!sessionOwner || sessionOwner.user_id !== userId) {
  return new Response(JSON.stringify({ error: 'Sessao nao pertence ao usuario' }), { status: 403, headers: corsHeaders });
}
```

Nenhuma mudanca no frontend — ele ja envia o token JWT no header `Authorization`.

## Resumo

| Arquivo | Acao |
|---------|------|
| `supabase/functions/nlq-proxy/index.ts` | Adicionar validacao JWT + verificacao de ownership da sessao |

Apenas 1 arquivo modificado. O restante do fluxo (sessoes, Realtime, frontend) ja esta correto para multi-usuario.

