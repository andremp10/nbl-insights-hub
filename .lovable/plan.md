

# Plano — Corrigir chat do agente (RLS + auth user ID)

## Problema raiz

Dois problemas combinados:

1. **RLS policies** nas tabelas `chat_sessions` e `chat_messages` estao configuradas apenas para o role `anon`. Agora que o usuario esta autenticado (role `authenticated`), todas as operacoes de INSERT/SELECT/UPDATE/DELETE sao bloqueadas com erro 403.

2. **`useChatSessions`** ainda usa um `deviceId` aleatorio do localStorage como `user_id`, em vez do `auth.uid()` do usuario autenticado.

## Solucao

### 1. Migration SQL — Adicionar policies para `authenticated`

Criar novas policies para o role `authenticated` em ambas as tabelas, com escopo por usuario (`auth.uid()`):

- `chat_sessions`: SELECT/INSERT/UPDATE/DELETE onde `user_id = auth.uid()::text`
- `chat_messages`: SELECT/INSERT/UPDATE/DELETE onde `session_id` pertence a uma sessao do usuario

### 2. Atualizar `useChatSessions` — Usar `auth.uid()` em vez de `deviceId`

- Remover toda a logica de `deviceId` / `DEVICE_ID_KEY`
- Importar `useAuth` do `AuthContext` para obter o `session.user.id`
- Usar `session.user.id` como `user_id` em todas as queries e inserts

### 3. Atualizar `useChatMessages` — Sem mudanca necessaria

O hook ja usa `session_id` para filtrar, e a edge function `nlq-proxy` usa `service_role_key`, entao nao e afetado pelo RLS do client.

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Adicionar RLS policies para role `authenticated` |
| `src/hooks/useChatSessions.ts` | Trocar `deviceId` por `auth.uid()` |

