## Cron job: limpar conversas inativas há > 10 dias

### Regra
Apagar registros em `public.chat_sessions` onde `COALESCE(last_message_at, created_at) < now() - interval '10 days'`. As mensagens em `chat_messages` caem junto via FK `ON DELETE CASCADE` (já existente).

### Migration única

1. Habilitar extensões `pg_cron` e `pg_net` (idempotente).
2. Criar função `public.cleanup_idle_chat_sessions()` `SECURITY DEFINER`, `search_path = public`, que executa o `DELETE` e devolve a contagem.
3. Agendar via `cron.schedule('cleanup-idle-chat-sessions', '0 3 * * *', $$ SELECT public.cleanup_idle_chat_sessions(); $$)` — diariamente às 03:00 UTC. Antes do schedule, `cron.unschedule` defensivo se já existir, para a migration ser re-executável.

### Observações

- Não preciso usar `pg_net`/edge function porque a operação é puramente SQL — o cron chama a função diretamente.
- Sem alteração de código front-end.
- Sem secrets/URLs envolvidos, então uso o tool de migrations normalmente.
