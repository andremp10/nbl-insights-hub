
-- 1. Drop the FK constraint that blocks deviceId-based inserts
ALTER TABLE public.chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;

-- 2. Add index for efficient lookup by deviceId
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- 3. Create trigger for sync_session_on_message (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_session_on_message'
  ) THEN
    CREATE TRIGGER trg_sync_session_on_message
      AFTER INSERT ON public.chat_messages
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_session_on_message();
  END IF;
END;
$$;
