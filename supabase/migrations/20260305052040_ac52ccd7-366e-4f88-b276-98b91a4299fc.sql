-- Add RLS policies for authenticated role on chat_sessions
CREATE POLICY "auth_select_sessions" ON public.chat_sessions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "auth_insert_sessions" ON public.chat_sessions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "auth_update_sessions" ON public.chat_sessions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "auth_delete_sessions" ON public.chat_sessions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Add RLS policies for authenticated role on chat_messages
CREATE POLICY "auth_select_messages" ON public.chat_messages
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "auth_insert_messages" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "auth_update_messages" ON public.chat_messages
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = session_id AND user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "auth_delete_messages" ON public.chat_messages
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = session_id AND user_id = auth.uid()));