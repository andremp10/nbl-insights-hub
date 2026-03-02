
-- Drop ALL existing restrictive policies on chat_sessions
DROP POLICY IF EXISTS "Usuário vê apenas suas sessões" ON public.chat_sessions;
DROP POLICY IF EXISTS "Usuário cria suas próprias sessões" ON public.chat_sessions;
DROP POLICY IF EXISTS "Usuário atualiza suas próprias sessões" ON public.chat_sessions;
DROP POLICY IF EXISTS "Usuário deleta suas próprias sessões" ON public.chat_sessions;

-- Drop ALL existing restrictive policies on chat_messages
DROP POLICY IF EXISTS "Usuário vê mensagens das suas sessões" ON public.chat_messages;
DROP POLICY IF EXISTS "Usuário insere mensagens nas suas sessões" ON public.chat_messages;
DROP POLICY IF EXISTS "Usuário atualiza mensagens das suas sessões" ON public.chat_messages;

-- Drop anon policies if they somehow exist
DROP POLICY IF EXISTS "anon_select_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "anon_insert_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "anon_delete_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "anon_update_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "anon_select_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anon_insert_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anon_update_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anon_delete_messages" ON public.chat_messages;

-- Create permissive policies for anon on chat_sessions
CREATE POLICY "anon_select_sessions" ON public.chat_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_sessions" ON public.chat_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_sessions" ON public.chat_sessions FOR DELETE TO anon USING (true);
CREATE POLICY "anon_update_sessions" ON public.chat_sessions FOR UPDATE TO anon USING (true);

-- Create permissive policies for anon on chat_messages
CREATE POLICY "anon_select_messages" ON public.chat_messages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_messages" ON public.chat_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_messages" ON public.chat_messages FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_messages" ON public.chat_messages FOR DELETE TO anon USING (true);
