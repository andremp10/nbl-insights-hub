## Plano final v4 — chat assíncrono e durável

Auditoria concluída. Schema atual confirmado:
- `chat_messages.status` é `text` com CHECK `IN ('pending','complete','error')` → precisa migração para incluir `processing`.
- `pg_cron` **não instalado**; `pg_net` **instalado** (0.19.5).
- Sem enum, sem trigger em chat_messages além de `sync_session_on_message` (já existente).

Todos os 4 ajustes obrigatórios + 3 recomendados incorporados.

---

### Ordem de execução

```text
1. Migration (schema + RPC + watchdog + pg_cron)
2. Edge Function NOVA: nlq-proxy-async  (nlq-proxy original intacta)
3. Ajuste do n8n (workflow espelhado novo OU branch interno) + teste manual do UPDATE
4. Frontend com feature flag VITE_CHAT_ASYNC_MODE (default false → usa nlq-proxy SSE)
5. Teste end-to-end com flag local
6. Ativação da flag em produção
```

Enquanto a flag estiver `false`, **nada muda** para o usuário: `nlq-proxy` original continua servindo SSE como hoje. (Item 1 resolvido pela opção preferida do usuário.)

---

### 1. Migration

```sql
-- 1.1 Atualiza CHECK de status para incluir 'processing'
ALTER TABLE public.chat_messages DROP CONSTRAINT chat_messages_status_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_status_check
  CHECK (status = ANY (ARRAY['pending','processing','complete','error']));
-- registros antigos (pending/complete/error) seguem válidos.

-- 1.2 Novas colunas
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS client_request_id text,
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_ack_timeout boolean DEFAULT false;

-- 1.3 Índices
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_messages_request_id
  ON public.chat_messages(request_id) WHERE request_id IS NOT NULL;

-- Recomendação acatada: idempotência client_request_id só para role='user'
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_messages_client_request_id_user
  ON public.chat_messages(session_id, client_request_id)
  WHERE client_request_id IS NOT NULL AND role = 'user';

CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to
  ON public.chat_messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_status_proc
  ON public.chat_messages(session_id, status) WHERE status = 'processing';
```

#### 1.4 RPC atômica (item 2)

```sql
CREATE OR REPLACE FUNCTION public.create_chat_async_request(
  p_session_id uuid,
  p_content text,
  p_client_request_id text
) RETURNS TABLE (
  user_message_id uuid,
  assistant_message_id uuid,
  request_id uuid,
  assistant_status text,
  is_duplicate boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user_id uuid;
  v_existing_user_id uuid;
  v_existing_asst_id uuid;
  v_existing_req_id uuid;
  v_existing_status text;
  v_user_msg_id uuid;
  v_asst_msg_id uuid;
  v_req_id uuid := gen_random_uuid();
BEGIN
  -- valida ownership da sessão
  SELECT user_id INTO v_user_id FROM chat_sessions WHERE id = p_session_id;
  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Session not found or access denied' USING ERRCODE = '42501';
  END IF;

  -- idempotência
  SELECT u.id, a.id, a.request_id, a.status
    INTO v_existing_user_id, v_existing_asst_id, v_existing_req_id, v_existing_status
  FROM chat_messages u
  JOIN chat_messages a ON a.reply_to_message_id = u.id AND a.role = 'assistant'
  WHERE u.session_id = p_session_id
    AND u.client_request_id = p_client_request_id
    AND u.role = 'user'
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    user_message_id := v_existing_user_id;
    assistant_message_id := v_existing_asst_id;
    request_id := v_existing_req_id;
    assistant_status := v_existing_status;
    is_duplicate := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- transação implícita da função: ou cria os dois, ou nenhum
  INSERT INTO chat_messages (session_id, role, content, status, client_request_id)
  VALUES (p_session_id, 'user', p_content, 'complete', p_client_request_id)
  RETURNING id INTO v_user_msg_id;

  INSERT INTO chat_messages (
    session_id, role, content, status,
    request_id, reply_to_message_id, processing_started_at
  )
  VALUES (
    p_session_id, 'assistant', '', 'processing',
    v_req_id, v_user_msg_id, now()
  )
  RETURNING id INTO v_asst_msg_id;

  user_message_id := v_user_msg_id;
  assistant_message_id := v_asst_msg_id;
  request_id := v_req_id;
  assistant_status := 'processing';
  is_duplicate := false;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.create_chat_async_request(uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_chat_async_request(uuid,text,text) TO authenticated;
```

#### 1.5 Watchdog hard 12min + RPC client timeout

```sql
CREATE OR REPLACE FUNCTION public.expire_stuck_processing_messages()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE chat_messages
  SET status='error',
      error_detail='A consulta excedeu o tempo limite. Tente reformular ou reduzir o período.',
      completed_at=now(), updated_at=now()
  WHERE status='processing'
    AND processing_started_at < now() - interval '12 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.report_client_timeout(p_assistant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE chat_messages cm
  SET status='error',
      error_detail='A consulta demorou mais que o esperado. Tente reformular ou reduzir o período.',
      completed_at=now(), updated_at=now()
  WHERE cm.id = p_assistant_id
    AND cm.status = 'processing'
    AND cm.processing_started_at < now() - interval '12 minutes'
    AND EXISTS (SELECT 1 FROM chat_sessions s WHERE s.id=cm.session_id AND s.user_id=auth.uid());
END $$;

GRANT EXECUTE ON FUNCTION public.report_client_timeout(uuid) TO authenticated;
```

#### 1.6 pg_cron obrigatório (item 3)

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'expire-stuck-chat-messages',
  '* * * * *', -- a cada 1 min
  $$ SELECT public.expire_stuck_processing_messages(); $$
);
```

Watchdog opportunistic na edge function fica como **defesa adicional**, não única (item 3 atendido).

---

### 2. Nova Edge Function `nlq-proxy-async` (item 1, opção preferida)

`supabase/functions/nlq-proxy-async/index.ts` — dispatcher JSON puro:

```text
1. CORS + valida JWT (mesmo padrão da nlq-proxy atual).
2. Body: { message, session_id, client_request_id }  (zod)
3. Chama RPC create_chat_async_request → recebe ids + is_duplicate + status atual.
4. Se is_duplicate=true: retorna IDs e status existente. Não dispara n8n de novo.
5. Se novo:
   - Monta payload n8n SEM service key, SEM url do supabase:
     { app, request_id, session_id, user_message_id,
       assistant_message_id, message, context: { date_range?, active_module? } }
   - fetch(N8N_WEBHOOK_URL_ASYNC, { signal: AbortSignal.timeout(8000) })
   - Tratamento:
       2xx          → status='processing' (segue normal)
       4xx/5xx      → UPDATE assistant SET status='error', error_detail amigável
       AbortError   → UPDATE assistant SET dispatch_ack_timeout=true (mantém processing)
6. Retorna JSON { user_message_id, assistant_message_id, request_id,
                  status, ack_timeout?, is_duplicate? } com 200.
```

`nlq-proxy` original **fica intacta**. config.toml ganha bloco para a nova função.

Secrets adicionais (já existem `SUPABASE_*`): adicionar `N8N_WEBHOOK_URL_ASYNC` (URL do novo workflow). Solicito ao usuário antes de codar.

---

### 3. Contrato n8n (workflow novo, paralelo)

Recomendação: **clonar** o workflow atual como "nlq-async". Mantém o atual servindo `nlq-proxy` legado.

Configuração obrigatória do Webhook do novo workflow:
- "Respond: Immediately"
- Resposta: `{ "accepted": true, "request_id": "...", "assistant_message_id": "..." }`
- Service role key como **Credencial Postgres** dentro do n8n (item 1 confirmado).

Nó final de sucesso (UPDATE multi-identificador):

```sql
UPDATE public.chat_messages
SET content=$1, status='complete', completed_at=now(), updated_at=now()
WHERE id=$2 AND request_id=$3 AND session_id=$4
  AND reply_to_message_id=$5 AND status='processing'
RETURNING id;
```

**Caminho global de erro (recomendação acatada):** error trigger / branch catch-all do workflow chama:

```sql
UPDATE public.chat_messages
SET status='error',
    error_detail=$1,            -- mensagem amigável padronizada
    completed_at=now(), updated_at=now()
WHERE id=$2 AND request_id=$3 AND session_id=$4
  AND reply_to_message_id=$5 AND status='processing'
RETURNING id;
```

Se o workflow morrer de forma não-capturável, o pg_cron de 1min resolve.

---

### 4. Frontend — `useChatMessages.ts`

```text
- Feature flag: const ASYNC = import.meta.env.VITE_CHAT_ASYNC_MODE === 'true'
- Se !ASYNC → código atual (SSE via /functions/v1/nlq-proxy) intacto.
- Se ASYNC:
   sendMessage:
     • client_request_id = crypto.randomUUID()
     • Otimistas user + assistant(processing).
     • POST /functions/v1/nlq-proxy-async (JSON simples).
     • Resposta substitui IDs otimistas pelos reais.
     • Se status==='error' → mostra direto.
     • Se status==='processing' → entra em modo wait.
   wait mode:
     • Realtime channel filtered por id=eq.<assistant_message_id> (UPDATE).
     • Polling fallback a cada 8s SELECT por id (até status mudar).
     • Soft 6min: banner "Processando há mais de 6 minutos…" (sem mudar status).
     • Hard 12min: RPC report_client_timeout(p_assistant_id). Realtime/polling pega o resultado.
   refresh da página:
     • Mensagens em 'processing' carregadas do DB reativam Realtime+polling pelo id.
     • Se já passou 12min ao montar, dispara RPC imediatamente.
- Recovery polling antigo (por timestamp) é removido somente no branch ASYNC.
- ChatMessage.tsx (recomendação acatada): renderizar bloco amigável quando
  status==='error' usando error_detail; fallback genérico se vazio.
```

---

### 5. Critérios de aceite — verificação

| Critério | Atendimento |
|---|---|
| consulta longa não mata edge | dispatcher ≤8s |
| usuário vê processing imediato | RPC cria assistant antes do retorno |
| resposta antiga não aparece | tracking estrito por id |
| 2 perguntas seguidas | client_request_id distinto + assistant ids distintos |
| refresh preserva estado | estado vem do DB; reata Realtime+polling |
| retry n8n não duplica | UNIQUE request_id + WHERE multi-id no UPDATE |
| falha n8n → msg amigável | erro global no n8n + watchdog pg_cron 1min |
| service key não trafega | credencial Postgres no n8n |
| ACK timeout não vira erro | flag dispatch_ack_timeout, status segue processing |
| produção segura | nlq-proxy intacta + flag VITE_CHAT_ASYNC_MODE |
| atomicidade user+assistant | RPC create_chat_async_request transacional |
| watchdog não opcional | pg_cron a cada 1min |
| schema status compatível | CHECK substituída para incluir 'processing'; valores antigos preservados |

---

### 6. Arquivos / artefatos

```text
supabase/migrations/<ts>_chat_async_processing.sql
  ├─ DROP/ADD CHECK status (inclui 'processing')
  ├─ ALTER chat_messages: 6 colunas novas
  ├─ Índices (UNIQUE request_id, UNIQUE client_request_id WHERE role='user', etc.)
  ├─ RPC create_chat_async_request (SECURITY DEFINER + valida ownership)
  ├─ FUNCTION expire_stuck_processing_messages
  ├─ RPC report_client_timeout
  ├─ CREATE EXTENSION pg_cron
  └─ cron.schedule a cada 1min

supabase/functions/nlq-proxy-async/index.ts      [NOVO]
supabase/functions/nlq-proxy-async/index.test.ts [NOVO]
  Testes: idempotência, ACK ok/erro/timeout, payload sem service_key.
supabase/config.toml
  └─ adicionar bloco [functions.nlq-proxy-async] verify_jwt=false, wall_clock_timeout=30

supabase/functions/nlq-proxy/index.ts           [INTACTO]

src/hooks/useChatMessages.ts
  └─ branch ASYNC adicionado; legado preservado

src/components/chat/ChatMessage.tsx
  └─ render amigável de status='processing' + error com error_detail

src/integrations/supabase/types.ts               [auto-regenerado]

.env.example
  └─ VITE_CHAT_ASYNC_MODE=false  (documentado)
```

---

### 7. Pré-requisito antes de codar

Preciso que você forneça via secrets:
- `N8N_WEBHOOK_URL_ASYNC` — URL do novo webhook do workflow espelhado (pode iniciar igual ao atual; trocamos depois).

Se preferir, posso usar o mesmo URL atual e você adapta o workflow no lugar. Diga qual caminho.

---

### 8. Entrega ao final da implementação

Vou anexar no chat:
- Como configurar o Webhook do n8n (Respond Immediately + JSON ACK).
- SQL pronto do UPDATE final (4 identificadores).
- SQL pronto do error branch global.
- Como criar credencial Postgres no n8n usando service role key (sem expor).
- Roteiro de teste manual antes de virar a flag.

Confirme para iniciar pela migration.
