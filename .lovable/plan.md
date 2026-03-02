
# Plano: Chat com Sessoes, Realtime e Fire-and-Forget

## Resumo

Reestruturar completamente o sistema de chat para usar:
- Edge Function fire-and-forget (retorna em < 2s, n8n processa em background)
- Supabase Realtime para receber respostas do agente
- Sessoes persistidas no banco (chat_sessions + chat_messages)
- Sidebar de sessoes estilo ChatGPT
- Guards contra disparos duplicados (4 camadas de protecao)

---

## Problema Critico: RLS vs Auth

O app usa autenticacao simples por senha (nao Supabase Auth). As tabelas `chat_sessions` e `chat_messages` tem politicas RLS que exigem `auth.uid()`, o que bloqueia TODAS as operacoes do frontend (leitura, escrita e Realtime).

**Solucao**: Adicionar politicas permissivas para o role `anon` nas tabelas de chat, ja que a seguranca real e a senha do dashboard. Isso permite que o frontend leia mensagens e receba eventos Realtime.

---

## Sequencia de Implementacao

### 1. Migracao SQL — Politicas RLS para anon

Adicionar politicas permissivas que permitam operacoes do frontend:

```sql
-- chat_sessions: anon pode ler, criar, deletar
CREATE POLICY "anon_select_sessions" ON chat_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_sessions" ON chat_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_sessions" ON chat_sessions FOR DELETE TO anon USING (true);
CREATE POLICY "anon_update_sessions" ON chat_sessions FOR UPDATE TO anon USING (true);

-- chat_messages: anon pode ler (Realtime) e deletar (retry)
CREATE POLICY "anon_select_messages" ON chat_messages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_delete_messages" ON chat_messages FOR DELETE TO anon USING (true);
```

Tambem habilitar Realtime na tabela chat_messages se ainda nao estiver:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
```

### 2. Edge Function `nlq-proxy` — Fire-and-Forget

Reescrever completamente. Nova logica:

1. Receber `{ message, session_id }` do frontend
2. Verificar duplicata (mesma mensagem + session nos ultimos 10s)
3. Inserir mensagem do usuario (status: complete)
4. Inserir mensagem pendente do assistente (status: pending)
5. Buscar ultimas 10 mensagens para contexto
6. Disparar fetch ao n8n via `EdgeRuntime.waitUntil()` (sem await)
7. Retornar `{ success: true, pending_message_id }` em < 2s

Sem autenticacao Supabase Auth (app usa senha simples). Usa `SUPABASE_SERVICE_ROLE_KEY` para todas as operacoes de banco.

URL do webhook: `https://n8n-nbl-golfine.up.railway.app/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6`

Se o n8n falhar ou nao responder, o handler em background atualiza a mensagem pendente para status `error`.

### 3. Hook `useChatSessions.ts`

Gerencia sessoes do usuario:
- `fetchSessions()` — lista sessoes ordenadas por last_message_at
- `createSession()` — cria nova sessao
- `deleteSession(id)` — exclui sessao
- `groupedSessions` — agrupa por Hoje/Ontem/Esta semana/Mais antigas
- Escuta Realtime em `chat_sessions` para atualizacoes automaticas

### 4. Hook `useChatMessages.ts`

Gerencia mensagens de uma sessao:
- Busca mensagens ao mudar de sessao
- Escuta Realtime (INSERT e UPDATE) em `chat_messages` filtrado por session_id
- `sendMessage(content)` — chama Edge Function, recebe pending_message_id
- Guard sincrono via `useRef` (invokeInProgressRef) para evitar disparos duplos
- Timeout de 5 minutos: se mensagem pendente nao for resolvida, marca como erro
- `retryMessage(errorMessageId)` — encontra mensagem do usuario anterior e reenvia
- Apos invoke, verifica se Edge Function criou o pending mesmo em caso de erro de rede

### 5. Componente `SessionsSidebar.tsx`

Sidebar lateral esquerda (260px desktop, drawer mobile):
- Botao "+ Nova conversa"
- Sessoes agrupadas por data (Hoje, Ontem, Esta semana, Mais antigas)
- Sessao ativa: destaque com borda laranja
- Menu de contexto com "Excluir" em cada sessao
- Botao de colapsar sidebar
- Background #0D0D0D, border-right #2A2A2A

### 6. Componente `ChatEmptyState.tsx`

Estado vazio quando nao ha mensagens na sessao:
- Icone sparkle grande
- Titulo "Assistente NBL Grafica"
- 3 pills de sugestao que preenchem o input (nao enviam)

### 7. Atualizar `ChatMessage.tsx`

Adaptar para o novo tipo de mensagem (do banco, com campo `status`):
- `status: pending` — mostra ThinkingBubble inline
- `status: complete` — renderiza markdown normalmente
- `status: error` — mostra mensagem de erro com botao "Tentar novamente"
- Remover dependencia do tipo `Message` do useChatbot.ts
- Usar o novo tipo `ChatMessage` do useChatMessages.ts

### 8. Atualizar `ChatInput.tsx`

- Remover botao de cancelar (sistema nunca cancela)
- Guard local via submitRef para impedir submit duplo
- Textarea e botao disabled quando `sending === true`
- Texto "Aguardando resposta..." abaixo do input quando sending
- `onSend` retorna Promise para o submitRef funcionar

### 9. Reescrever `Chat.tsx`

Layout com duas colunas:
- Esquerda: SessionsSidebar (recolhivel)
- Direita: area de chat com AppHeader

Comportamento ao carregar:
1. Buscar sessoes
2. Se existir, selecionar a mais recente
3. Se nao, criar nova automaticamente
4. Checar `nbl_pending_query` no localStorage e auto-enviar

### 10. Remover `useChatbot.ts`

O hook antigo (localStorage, fetch sincrono) sera substituido pelos novos hooks. O arquivo pode ser removido ou esvaziado.

---

## Arquivos Afetados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar (RLS + Realtime) |
| supabase/functions/nlq-proxy/index.ts | Reescrever (fire-and-forget) |
| src/hooks/useChatSessions.ts | Criar |
| src/hooks/useChatMessages.ts | Criar |
| src/components/chat/SessionsSidebar.tsx | Criar |
| src/components/chat/ChatEmptyState.tsx | Criar |
| src/components/chat/ChatMessage.tsx | Reescrever (novo tipo + status) |
| src/components/chat/ChatInput.tsx | Reescrever (sem cancel, com guards) |
| src/pages/Chat.tsx | Reescrever (sidebar + realtime) |
| src/hooks/useChatbot.ts | Remover |

---

## Guards Contra Disparos Duplicados (4 camadas)

1. **useRef sincrono** no sendMessage — nao depende de re-render do React
2. **Edge Function retorna antes do fetch** ao n8n via waitUntil — cliente nunca sofre timeout
3. **Janela de idempotencia de 10s** na Edge Function — detecta duplicata no banco antes de INSERT
4. **submitRef local** no ChatInput com disabled no textarea e botao — impossivel enviar fisicamente enquanto aguarda

---

## Regra Critica de UX

O sistema NUNCA abandona o usuario sem resposta. O typing indicator permanece visivel ate:
- Resposta completa do n8n chegar via Realtime
- Timeout de 5 minutos sem resposta (marca como erro com opcao de retry)

Nao existe botao de cancelar. A espera faz parte da experiencia.
