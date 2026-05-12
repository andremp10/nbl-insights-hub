UPDATE public.chat_messages
SET status = 'error',
    error_detail = COALESCE(error_detail, 'Mensagem migrada para o novo modelo síncrono. Tente reenviar.'),
    completed_at = COALESCE(completed_at, now()),
    updated_at = now()
WHERE status IN ('processing', 'streaming', 'pending');