import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  error_detail?: string | null;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const STREAM_TIMEOUT_MS = 2 * 60 * 1000;

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const invokeInProgressRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load history + subscribe to Realtime for reconnects
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
          if (hasPending) setSending(true);
        }
        setLoading(false);
      });

    // Realtime for messages inserted by the Edge Function (reconciliation)
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
          // Replace optimistic msg if user_message_id matches
          const optIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.role === newMsg.role && m.content === newMsg.content);
          if (optIdx !== -1) {
            const copy = [...prev];
            copy[optIdx] = newMsg;
            return copy;
          }
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
          setSending(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      abortRef.current?.abort();
    };
  }, [sessionId]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (invokeInProgressRef.current) return false;
    if (!content.trim() || !sessionId) return false;

    invokeInProgressRef.current = true;
    setSending(true);

    const trimmed = content.trim();
    const optUserId = `opt-user-${Date.now()}`;
    const optAsstId = `opt-asst-${Date.now()}`;
    const now = new Date().toISOString();

    // Optimistic: add user message + empty streaming assistant message
    setMessages(prev => [
      ...prev,
      { id: optUserId, session_id: sessionId, role: 'user', content: trimmed, status: 'complete', created_at: now },
      { id: optAsstId, session_id: sessionId, role: 'assistant', content: '', status: 'streaming', created_at: now },
    ]);

    const abort = new AbortController();
    abortRef.current = abort;

    const timeout = setTimeout(() => abort.abort(), STREAM_TIMEOUT_MS);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token || '';

      const response = await fetch(`${SUPABASE_URL}/functions/v1/nlq-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      if (!response.body) {
        // Non-streaming fallback
        const text = await response.text();
        setMessages(prev => prev.map(m =>
          m.id === optAsstId ? { ...m, content: text.trim(), status: 'complete' as const } : m
        ));
        return true;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let realUserMsgId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();

          if (payload === '[DONE]') {
            // Stream complete
            setMessages(prev => prev.map(m =>
              m.id === optAsstId ? { ...m, status: 'complete' as const } : m
            ));
            break;
          }

          try {
            const parsed = JSON.parse(payload);

            if (parsed.user_message_id) {
              realUserMsgId = parsed.user_message_id;
              // Reconcile optimistic user message ID
              setMessages(prev => prev.map(m =>
                m.id === optUserId ? { ...m, id: realUserMsgId! } : m
              ));
              continue;
            }

            if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === optAsstId ? { ...m, status: 'error' as const, error_detail: parsed.error } : m
              ));
              break;
            }

            if (parsed.token) {
              accumulated += parsed.token;
              const newContent = accumulated;
              setMessages(prev => prev.map(m =>
                m.id === optAsstId ? { ...m, content: newContent } : m
              ));
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      return true;
    } catch (err: any) {
      console.error('Erro ao enviar:', err);
      const errorMsg = err.name === 'AbortError'
        ? 'A consulta demorou mais que o esperado. Por favor, tente novamente.'
        : 'Não foi possível enviar sua mensagem. Tente novamente.';

      setMessages(prev => prev.map(m =>
        m.id === optAsstId
          ? { ...m, content: '', status: 'error' as const, error_detail: errorMsg }
          : m
      ));
      return false;
    } finally {
      clearTimeout(timeout);
      invokeInProgressRef.current = false;
      setSending(false);
      abortRef.current = null;
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

    // Remove the error message
    if (!errorMessageId.startsWith('opt-')) {
      await supabase.from('chat_messages').delete().eq('id', errorMessageId);
    }
    // Also remove the user message that triggered it (will be re-sent)
    const userMsgId = userMessage.id;
    if (!userMsgId.startsWith('opt-')) {
      await supabase.from('chat_messages').delete().eq('id', userMsgId);
    }
    setMessages(prev => prev.filter(m => m.id !== errorMessageId && m.id !== userMsgId));

    await sendMessage(userMessage.content);
  }, [messages, sendMessage]);

  return { messages, loading, sending, sendMessage, retryMessage };
}
