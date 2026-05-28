
DROP POLICY IF EXISTS "Enable read access for all users" ON public.is_pedidos;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.is_financeiro_lancamentos;

DROP POLICY IF EXISTS anon_select_messages ON public.chat_messages;
DROP POLICY IF EXISTS anon_insert_messages ON public.chat_messages;
DROP POLICY IF EXISTS anon_update_messages ON public.chat_messages;
DROP POLICY IF EXISTS anon_delete_messages ON public.chat_messages;

DROP POLICY IF EXISTS anon_select_sessions ON public.chat_sessions;
DROP POLICY IF EXISTS anon_insert_sessions ON public.chat_sessions;
DROP POLICY IF EXISTS anon_update_sessions ON public.chat_sessions;
DROP POLICY IF EXISTS anon_delete_sessions ON public.chat_sessions;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND (c.relname LIKE 'is\_%' ESCAPE '\' OR c.relname IN ('etl_error_logs','n8n_chat_histories'))
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

REVOKE ALL ON public.vw_dashboard_pedidos FROM anon;
REVOKE ALL ON public.vw_chat_context FROM anon;
REVOKE ALL ON public.vw_schema_llm_guide FROM anon;
REVOKE ALL ON public.v_pedidos_entregas FROM anon;
GRANT SELECT ON public.vw_dashboard_pedidos TO authenticated;
GRANT SELECT ON public.vw_chat_context TO authenticated;
GRANT SELECT ON public.vw_schema_llm_guide TO authenticated;
GRANT SELECT ON public.v_pedidos_entregas TO authenticated;

ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.try_parse_jsonb(text) SET search_path = public;
ALTER FUNCTION public.sync_session_on_message() SET search_path = public;
ALTER FUNCTION public.get_finance_kpis(text, text) SET search_path = public;
ALTER FUNCTION public.get_financeiro_kpis(date, date) SET search_path = public;
ALTER FUNCTION public.get_financeiro_graficos(date, date) SET search_path = public;
ALTER FUNCTION public.cleanup_text(text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_master(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_snapshot_meta() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.expire_stuck_processing_messages() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_session_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_finance_kpis(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_financeiro_kpis(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_financeiro_graficos(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_chat_async_request(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_client_timeout(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_master(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_snapshot_meta() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_kpis(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financeiro_kpis(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financeiro_graficos(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_chat_async_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_client_timeout(uuid) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "auth users own topic" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "auth users own topic"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        (realtime.topic() LIKE 'chat:' || auth.uid()::text || ':%')
        OR (realtime.topic() LIKE 'session:' || auth.uid()::text || ':%')
        OR (realtime.topic() = auth.uid()::text)
      )
    $p$;
  END IF;
END $$;
