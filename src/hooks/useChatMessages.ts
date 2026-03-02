import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'complete' | 'error';
  error_detail?: string | null;
  created_at: string;
}

const MAX_WAIT_MS = 5 * 60 * 1000;

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const invokeInProgressRef = useRef(false);
  const pendingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setSending(false);
    invokeInProgressRef.current = false;

    supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const msgs = data as ChatMessage[];
          setMessages(msgs);
          const hasPending = msgs.some(m => m.status === 'pending');
          if (hasPending) {
            setSending(true);
            invokeInProgressRef.current = true;
          }
        }
        setLoading(false);
      });

    const channel = supabase
      .channel(`messages-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMsg.id);
          return exists ? prev : [...prev, newMsg];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev =>
          prev.map(m => m.id === updated.id ? { ...m, ...updated } : m)
        );
        if (updated.status !== 'pending') {
          const timeout = pendingTimeouts.current.get(updated.id);
          if (timeout) {
            clearTimeout(timeout);
            pendingTimeouts.current.delete(updated.id);
          }
          invokeInProgressRef.current = false;
          setSending(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      pendingTimeouts.current.forEach(t => clearTimeout(t));
      pendingTimeouts.current.clear();
    };
  }, [sessionId]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (invokeInProgressRef.current) return false;
    if (!content.trim() || !sessionId) return false;

    invokeInProgressRef.current = true;
    setSending(true);

    // No optimistic insert — the Edge Function inserts user msg + pending msg,
    // and Realtime delivers both. This prevents duplicate messages.

    try {
      console.log('[sendMessage] invoking nlq-proxy, sessionId:', sessionId);
      const { data, error } = await supabase.functions.invoke('nlq-proxy', {
        body: { message: content.trim(), session_id: sessionId },
      });

      if (error) {
        const { data: check } = await supabase
          .from('chat_messages')
          .select('id, status')
          .eq('session_id', sessionId)
          .eq('status', 'pending')
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (check) {
          setSending(true);
          return true;
        }
        throw error;
      }

      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');

      const pendingId: string = data.pending_message_id;
      if (pendingId) {
        const timeout = setTimeout(async () => {
          const { data: checkMsg } = await supabase
            .from('chat_messages')
            .select('status')
            .eq('id', pendingId)
            .single();

          if (checkMsg?.status === 'pending') {
            await supabase
              .from('chat_messages')
              .update({
                status: 'error',
                content: '',
                error_detail: 'A consulta demorou mais que o esperado. Por favor, tente novamente.',
              })
              .eq('id', pendingId);
          }
          pendingTimeouts.current.delete(pendingId);
          invokeInProgressRef.current = false;
          setSending(false);
        }, MAX_WAIT_MS);
        pendingTimeouts.current.set(pendingId, timeout);
      }

      return true;
    } catch (err) {
      console.error('Erro ao enviar:', err);
      invokeInProgressRef.current = false;
      setSending(false);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: 'Não foi possível enviar sua mensagem. Tente novamente.',
        status: 'error',
        created_at: new Date().toISOString(),
      }]);
      return false;
    }
  }, [sessionId]);

  const retryMessage = useCallback(async (errorMessageId: string) => {
    const errorIndex = messages.findIndex(m => m.id === errorMessageId);
    if (errorIndex === -1) return;

    const userMessage = messages
      .slice(0, errorIndex)
      .reverse()
      .find(m => m.role === 'user');

    if (!userMessage) return;

    if (!errorMessageId.startsWith('err-') && !errorMessageId.startsWith('opt-')) {
      await supabase.from('chat_messages').delete().eq('id', errorMessageId);
    }
    setMessages(prev => prev.filter(m => m.id !== errorMessageId));

    await sendMessage(userMessage.content);
  }, [messages, sendMessage]);

  return { messages, loading, sending, sendMessage, retryMessage };
}
