import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'streaming' | 'processing' | 'complete' | 'error';
  error_detail?: string | null;
  created_at: string;
  // legacy fields kept for type compatibility (unused in sync mode)
  steps?: string[];
  startedAt?: number;
  request_id?: string | null;
  client_request_id?: string | null;
  reply_to_message_id?: string | null;
  processing_started_at?: string | null;
  softTimeout?: boolean;
}

function makeRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Load history when session changes ──────────────────────────────────────
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('load messages failed', error);
          setMessages([]);
        } else {
          setMessages((data ?? []) as ChatMessage[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ── Realtime: keep multi-tab in sync, ignore duplicates ────────────────────
  useEffect(() => {
    if (!sessionId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const ch = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [sessionId]);

  // ── Send message synchronously through nlq-chat ────────────────────────────
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const text = content.trim();
      if (!text || !sessionId || sendingRef.current) return false;
      sendingRef.current = true;
      setSending(true);

      const clientRequestId = makeRequestId();
      const tempUserId = `temp-user-${clientRequestId}`;
      const tempAssistantId = `temp-asst-${clientRequestId}`;
      const now = new Date().toISOString();

      // Optimistic UI: user + assistant placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: tempUserId,
          session_id: sessionId,
          role: 'user',
          content: text,
          status: 'complete',
          created_at: now,
          client_request_id: clientRequestId,
        },
        {
          id: tempAssistantId,
          session_id: sessionId,
          role: 'assistant',
          content: '',
          status: 'pending',
          created_at: now,
        },
      ]);

      try {
        const { data, error } = await supabase.functions.invoke('nlq-chat', {
          body: {
            session_id: sessionId,
            message: text,
            client_request_id: clientRequestId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Fortaleza',
          },
        });

        if (error) throw error;

        const replyText: string = data?.reply?.text ?? '';
        const status: 'complete' | 'error' = data?.status === 'error' ? 'error' : 'complete';
        const errorDetail: string | null = data?.error_detail ?? null;
        const realAssistantId: string = data?.assistant_id ?? tempAssistantId;
        const realUserId: string = data?.user_message_id ?? tempUserId;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === tempUserId) return { ...m, id: realUserId };
            if (m.id === tempAssistantId) {
              return {
                ...m,
                id: realAssistantId,
                content: replyText,
                status,
                error_detail: errorDetail,
              };
            }
            return m;
          }),
        );
        return status === 'complete';
      } catch (e: any) {
        console.error('sendMessage failed', e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  status: 'error',
                  content: 'Não foi possível obter a resposta. Tente novamente.',
                  error_detail: e?.message ?? 'unknown error',
                }
              : m,
          ),
        );
        return false;
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [sessionId],
  );

  // ── Retry: resend the user message that precedes a failed assistant ───────
  const retryMessage = useCallback(
    async (assistantId: string): Promise<boolean> => {
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx <= 0) return false;
      // find preceding user message
      let userMsg: ChatMessage | null = null;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          userMsg = messages[i];
          break;
        }
      }
      if (!userMsg) return false;
      // remove the failed assistant + its user (we'll re-create both)
      setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg!.id));
      return sendMessage(userMsg.content);
    },
    [messages, sendMessage],
  );

  return { messages, loading, sending, sendMessage, retryMessage };
}
