-- ============================================================
-- Chat assíncrono e durável v4
-- ============================================================

-- 1.1 Atualiza CHECK de status para incluir 'processing'
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_status_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'complete'::text, 'error'::text]));

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_messages_client_request_id_user
  ON public.chat_messages(session_id, client_request_id)
  WHERE client_request_id IS NOT NULL AND role = 'user';

CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to
  ON public.chat_messages(reply_to_message_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_status_proc
  ON public.chat_messages(session_id, status) WHERE status = 'processing';

-- ============================================================
-- 1.4 RPC atômica: cria user + assistant em uma transação
-- ============================================================
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- valida ownership
  SELECT user_id INTO v_user_id FROM chat_sessions WHERE id = p_session_id;
  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Session not found or access denied' USING ERRCODE = '42501';
  END IF;

  IF p_client_request_id IS NULL OR length(p_client_request_id) = 0 THEN
    RAISE EXCEPTION 'client_request_id is required' USING ERRCODE = '22023';
  END IF;

  -- idempotência: já processou esse client_request_id?
  SELECT u.id, a.id, a.request_id, a.status
    INTO v_existing_user_id, v_existing_asst_id, v_existing_req_id, v_existing_status
  FROM chat_messages u
  LEFT JOIN chat_messages a
    ON a.reply_to_message_id = u.id AND a.role = 'assistant'
  WHERE u.session_id = p_session_id
    AND u.client_request_id = p_client_request_id
    AND u.role = 'user'
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    user_message_id := v_existing_user_id;
    assistant_message_id := v_existing_asst_id;
    request_id := v_existing_req_id;
    assistant_status := COALESCE(v_existing_status, 'processing');
    is_duplicate := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- cria user message
  INSERT INTO chat_messages (session_id, role, content, status, client_request_id)
  VALUES (p_session_id, 'user', p_content, 'complete', p_client_request_id)
  RETURNING id INTO v_user_msg_id;

  -- cria assistant message em processing
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
END;
$$;

REVOKE ALL ON FUNCTION public.create_chat_async_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_chat_async_request(uuid, text, text) TO authenticated;

-- ============================================================
-- 1.5 Watchdog server-side (hard timeout 12min)
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_stuck_processing_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE chat_messages
  SET status = 'error',
      error_detail = 'A consulta excedeu o tempo limite. Tente reformular ou reduzir o período.',
      completed_at = now(),
      updated_at = now()
  WHERE status = 'processing'
    AND processing_started_at IS NOT NULL
    AND processing_started_at < now() - interval '12 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- RPC para o cliente reportar timeout (servidor decide)
CREATE OR REPLACE FUNCTION public.report_client_timeout(p_assistant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chat_messages cm
  SET status = 'error',
      error_detail = 'A consulta demorou mais que o esperado. Tente reformular ou reduzir o período.',
      completed_at = now(),
      updated_at = now()
  WHERE cm.id = p_assistant_id
    AND cm.status = 'processing'
    AND cm.processing_started_at IS NOT NULL
    AND cm.processing_started_at < now() - interval '12 minutes'
    AND EXISTS (
      SELECT 1 FROM chat_sessions s
      WHERE s.id = cm.session_id AND s.user_id = auth.uid()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.report_client_timeout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_timeout(uuid) TO authenticated;

-- ============================================================
-- 1.6 pg_cron: agenda watchdog a cada 1min
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stuck-chat-messages') THEN
    PERFORM cron.unschedule('expire-stuck-chat-messages');
  END IF;
END $$;

SELECT cron.schedule(
  'expire-stuck-chat-messages',
  '* * * * *',
  $$ SELECT public.expire_stuck_processing_messages(); $$
);