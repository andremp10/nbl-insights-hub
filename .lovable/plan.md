
Objetivo imediato: restaurar 100% do fluxo crítico do chat (criar conversa, criar conversa automaticamente ao enviar e disparar webhook sem travar), corrigindo a causa raiz no banco e endurecendo o frontend contra falhas silenciosas.

1) Diagnóstico consolidado (causa raiz real)
- O travamento não é mais RLS.
- O bloqueio atual é estrutural no banco:
  - `chat_sessions.user_id` tem FK `chat_sessions_user_id_fkey -> auth.users(id)`.
  - `auth.users` está vazio (0 usuários).
  - O frontend usa `deviceId` local (UUID), não Supabase Auth.
  - Resultado: `createSession()` falha com 409/23503 e nunca cria sessão.
- Efeito em cascata:
  - `currentSessionId` fica `null`.
  - `sendMessage()` retorna no guard `if (!sessionId)`.
  - Edge function `nlq-proxy` nunca é chamada.
  - Usuário percebe “nada acontece”.

2) Correção de banco (prioridade máxima)
Criar uma nova migration SQL para remover o acoplamento errado com `auth.users`:
- Dropar FK problemática:
  - `ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;`
- Manter `user_id uuid NOT NULL` (compatível com `deviceId` atual).
- Criar índice para leitura por usuário-dispositivo:
  - `CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);`

Ajuste complementar importante:
- Existe função `public.sync_session_on_message()`, mas hoje não há trigger ativo em `chat_messages`.
- Criar trigger (idempotente via bloco DO) para atualizar `last_message_at` e título automático:
  - `AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.sync_session_on_message();`

3) Correções críticas no frontend (evitar “silêncio” e perda de mensagem)
Arquivos-alvo:
- `src/hooks/useChatSessions.ts`
- `src/hooks/useChatMessages.ts`
- `src/pages/Chat.tsx` (ChatInputInline interno)

3.1 `useChatSessions.ts`
- Fortalecer `createSession()`:
  - Capturar erro e logar claramente (incluindo código/constraint).
  - Evitar chamadas concorrentes com `creatingRef` (duplo clique em “Nova conversa”).
  - Retornar `null` explicitamente em falha.
- Em `fetchSessions()`, logar erro quando existir (hoje falha é silenciosa).

3.2 `Chat.tsx` (fluxo automático robusto)
- Criar helper `ensureSession()`:
  - Se já houver `currentSessionId`, retorna.
  - Se não houver, chama `createSession()`, seta `currentSessionId` e retorna id.
- Aplicar `ensureSession()` em dois cenários:
  1. bootstrap inicial (primeiro carregamento);
  2. envio de mensagem quando não há sessão ativa.
- Adicionar fila simples para mensagem pendente:
  - Se usuário enviar sem sessão, guardar mensagem em `pendingToSendRef`.
  - Após sessão ser criada e `currentSessionId` atualizado, enviar automaticamente.
- Evitar loops de bootstrap com `bootstrapTriedRef` (impede tentativas repetitivas em renders).

3.3 `useChatMessages.ts`
- Ajustar `sendMessage` para retornar sucesso (`Promise<boolean>`):
  - `false` quando não enviou (sem sessão, guard ativo, erro real).
  - `true` quando invoke foi aceito ou quando detectou pending já criado.
- Manter guard síncrono `invokeInProgressRef` como trava principal.
- Preservar lógica anti-duplicidade atual (sem retry automático).

3.4 `ChatInputInline` (em `Chat.tsx`)
- Não limpar input antes da confirmação de envio.
- Novo fluxo:
  - chama `onSend(msg)` e só limpa se retornar `true`.
  - se retornar `false`, mantém texto no campo para o usuário tentar de novo.
- Isso evita perda de mensagem quando sessão ainda não existe.

4) Edge Function (`nlq-proxy`) – auditoria e ajuste mínimo
Arquivo:
- `supabase/functions/nlq-proxy/index.ts`

Status atual:
- Fire-and-forget e idempotência de 10s já estão corretos.
- Não há logs porque a função não estava sendo chamada (bloqueio anterior no createSession).

Ação:
- Sem refatoração grande.
- Apenas validação de consistência pós-correção:
  - confirmar que ainda retorna imediatamente com `pending_message_id`;
  - confirmar que continua 1 webhook por mensagem enviada.

5) Sequência de implementação (ordem obrigatória)
1. Migration SQL: remover FK de `chat_sessions.user_id` e criar trigger ausente.
2. Ajustar `useChatSessions.ts` (erros + trava de criação concorrente).
3. Ajustar `Chat.tsx` (ensureSession + fila de envio pendente).
4. Ajustar `useChatMessages.ts` para retorno booleano de envio.
5. Ajustar `ChatInputInline` para não limpar input em envio não confirmado.
6. Validar manualmente no preview + logs/requisições.

6) Critérios de aceite (teste ponta a ponta)
- Botão “Nova conversa” cria sessão imediatamente.
- Ao abrir `/chat` sem sessões, uma sessão é criada automaticamente.
- Se usuário digitar e enviar sem sessão ativa, sessão é criada e mensagem enviada em seguida (sem perder texto).
- Network:
  - `POST /rest/v1/chat_sessions` retorna 201 (não 409).
  - `POST /functions/v1/nlq-proxy` ocorre ao enviar.
- Edge logs deixam de ficar vazios.
- Realtime atualiza pending -> complete/error normalmente.
- Não há disparo duplicado de webhook para uma única mensagem.

7) Risco técnico e mitigação
- Remover FK para `auth.users` reduz integridade relacional com Supabase Auth, mas é a correção correta para a arquitetura atual (auth local por senha + `deviceId`).
- Mitigação futura (quando quiser endurecer segurança): migrar para Supabase Auth real e voltar a usar FK via `profiles`/`auth.users`.

8) Resultado esperado após aprovação
- Chat volta a funcionar de forma previsível:
  - criação de conversa funciona;
  - envio cria conversa automaticamente quando necessário;
  - webhook n8n volta a ser disparado;
  - desaparece o “nada funciona no chat assistente”.
