

# Correcao Critica: RLS Bloqueando Todas as Operacoes do Chat

## Problema Identificado

O problema NAO esta no codigo do frontend nem na Edge Function. O sistema trava porque **as politicas RLS bloqueiam TODAS as operacoes** do frontend nas tabelas de chat.

### Evidencia Concreta

A network request mostra o erro:
```
POST /rest/v1/chat_sessions → 401
Response: "new row violates row-level security policy for table chat_sessions"
```

### Causa Raiz

Todas as politicas RLS nas tabelas `chat_sessions` e `chat_messages` exigem `auth.uid()`:

```text
chat_sessions INSERT: WITH CHECK (user_id = auth.uid())
chat_sessions SELECT: USING (user_id = auth.uid())
chat_messages SELECT: USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()))
```

Mas o app NAO usa Supabase Auth. Usa um `deviceId` gerado via `crypto.randomUUID()` e armazenado em localStorage. Portanto `auth.uid()` e sempre NULL e todas as operacoes falham.

### Consequencia em Cascata

1. `createSession()` falha silenciosamente (retorna null)
2. `currentSessionId` nunca e definido
3. `sendMessage()` retorna imediatamente no guard `if (!sessionId)`
4. Nenhum invoke da Edge Function acontece
5. UI trava sem feedback

## Solucao

### Etapa 1: Migracao SQL — Politicas RLS para anon

Adicionar politicas permissivas que permitam o role `anon` operar nas tabelas de chat. A seguranca real do app e a senha do dashboard (AuthContext), nao Supabase Auth.

```sql
-- chat_sessions: permitir anon fazer tudo
CREATE POLICY "anon_select_sessions" ON public.chat_sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_sessions" ON public.chat_sessions
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_delete_sessions" ON public.chat_sessions
  FOR DELETE TO anon USING (true);

CREATE POLICY "anon_update_sessions" ON public.chat_sessions
  FOR UPDATE TO anon USING (true);

-- chat_messages: permitir anon ler e deletar
CREATE POLICY "anon_select_messages" ON public.chat_messages
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_messages" ON public.chat_messages
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_messages" ON public.chat_messages
  FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_delete_messages" ON public.chat_messages
  FOR DELETE TO anon USING (true);
```

Tambem garantir que Realtime esta habilitado:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
```

### Etapa 2: Corrigir warnings do React (ref em function components)

O console mostra dois warnings de ref em function components (`ChatEmptyState` e `ChatInputInline`). Isso nao causa o travamento mas polui o console. Nao e prioridade nesta correcao.

### Etapa 3: Adicionar console.logs de diagnostico no sendMessage

Apos a migracao SQL, o fluxo deve funcionar. Adicionar logs temporarios para confirmar:

```typescript
// Em useChatMessages.ts sendMessage:
console.log('[sendMessage] sessionId:', sessionId, 'inProgress:', invokeInProgressRef.current);
```

## Resumo

O unico bloqueio real e a falta de politicas RLS para o role `anon`. A migracao SQL desbloqueia todo o sistema sem precisar alterar nenhum arquivo de codigo.

| Item | Status |
|------|--------|
| Edge Function (nlq-proxy) | OK — fire-and-forget com idempotencia |
| useChatMessages.ts | OK — guards, Realtime, timeout |
| useChatSessions.ts | OK — deviceId, CRUD |
| ChatInput (Chat.tsx inline) | OK — submitRef, disabled |
| RLS policies | BLOQUEANDO — precisa de politicas anon |
| Realtime publication | Verificar se ja inclui as tabelas |

## Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar politicas RLS para anon |
| Nenhum arquivo .ts/.tsx | Sem alteracao necessaria |

