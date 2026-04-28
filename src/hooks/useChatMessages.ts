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
  steps?: string[];
  startedAt?: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const STREAM_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutes
const RECOVERY_POLL_MS = 10_000; // Poll DB every 10s if stream dies without response
const RECOVERY_MAX_MS = 5 * 60 * 1000; // Keep polling up to 5 minutes

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const invokeInProgressRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup recovery timer
  const clearRecovery = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearInterval(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  // Load history + subscribe to Realtime
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
          // Reconcile optimistic messages
          const optIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.role === newMsg.role && m.content === newMsg.content);
          if (optIdx !== -1) {
            const copy = [...prev];
            copy[optIdx] = newMsg;
            return copy;
          }
          // If this is an assistant message arriving via Realtime (recovery case),
          // replace any optimistic assistant that's still streaming/pending
          if (newMsg.role === 'assistant' && (newMsg.status === 'complete' || newMsg.status === 'error')) {
            const streamingIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.role === 'assistant' && (m.status === 'streaming' || m.status === 'pending'));
            if (streamingIdx !== -1) {
              const copy = [...prev];
              copy[streamingIdx] = newMsg;
              // Recovery worked — stop polling and sending state
              setSending(false);
              clearRecovery();
              return copy;
            }
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
      clearRecovery();
    };
  }, [sessionId, clearRecovery]);

  // Recovery: poll DB for assistant response when stream dies
  const startRecovery = useCallback((sid: string, optAsstId: string, userContent: string) => {
    clearRecovery();
    const startedAt = Date.now();
    console.log('[chat] Starting recovery polling for session', sid);

    recoveryTimerRef.current = setInterval(async () => {
      // Check if we've been polling too long
      if (Date.now() - startedAt > RECOVERY_MAX_MS) {
        console.log('[chat] Recovery timeout reached');
        clearRecovery();
        setMessages(prev => prev.map(m =>
          m.id === optAsstId && (m.status === 'streaming' || m.status === 'pending')
            ? { ...m, status: 'error' as const, error_detail: 'A consulta demorou mais que o esperado. Por favor, tente com um período menor ou reformule a pergunta.' }
            : m
        ));
        setSending(false);
        return;
      }

      // Poll for the latest assistant message in this session
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && (data.status === 'complete' || data.status === 'error') && data.content) {
        console.log('[chat] Recovery found assistant message:', data.id);
        clearRecovery();
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === optAsstId);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = data as ChatMessage;
            return copy;
          }
          return prev;
        });
        setSending(false);
      }
    }, RECOVERY_POLL_MS);
  }, [clearRecovery]);

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
      { id: optAsstId, session_id: sessionId, role: 'assistant', content: '', status: 'streaming', created_at: now, steps: [], startedAt: Date.now() },
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
      let receivedDone = false;
      let receivedAnyToken = false;

      // Throttle setMessages updates to 1 per animation frame to avoid
      // re-rendering on every token. Tokens accumulate in `accumulated`,
      // and a single rAF flushes the latest content into state.
      let pendingFlush = false;
      let rafId = 0;
      const scheduleFlush = () => {
        if (pendingFlush) return;
        pendingFlush = true;
        rafId = requestAnimationFrame(() => {
          pendingFlush = false;
          const snapshot = accumulated;
          setMessages(prev => prev.map(m =>
            m.id === optAsstId ? { ...m, content: snapshot } : m
          ));
        });
      };
      const flushNow = () => {
        if (rafId) cancelAnimationFrame(rafId);
        pendingFlush = false;
        const snapshot = accumulated;
        setMessages(prev => prev.map(m =>
          m.id === optAsstId ? { ...m, content: snapshot } : m
        ));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();

          if (payload === '[DONE]') {
            receivedDone = true;
            flushNow();
            setMessages(prev => prev.map(m =>
              m.id === optAsstId ? { ...m, status: 'complete' as const } : m
            ));
            break;
          }

          try {
            const parsed = JSON.parse(payload);

            if (parsed.user_message_id) {
              realUserMsgId = parsed.user_message_id;
              setMessages(prev => prev.map(m =>
                m.id === optUserId ? { ...m, id: realUserMsgId! } : m
              ));
              continue;
            }

            if (parsed.error) {
              flushNow();
              setMessages(prev => prev.map(m =>
                m.id === optAsstId ? { ...m, status: 'error' as const, error_detail: parsed.error } : m
              ));
              receivedDone = true;
              break;
            }

            if (parsed.type === 'ping') continue;

            if (parsed.type === 'done') {
              receivedDone = true;
              flushNow();
              setMessages(prev => prev.map(m =>
                m.id === optAsstId ? { ...m, status: 'complete' as const } : m
              ));
              continue;
            }

            if (parsed.type === 'step' && parsed.step) {
              const step = parsed.step;
              setMessages(prev => prev.map(m =>
                m.id === optAsstId
                  ? { ...m, steps: [...(m.steps || []), step] }
                  : m
              ));
              continue;
            }

            if (parsed.type === 'token' && parsed.token) {
              receivedAnyToken = true;
              accumulated += parsed.token;
              scheduleFlush();
              continue;
            }

            // Legacy: plain token without type field
            if (parsed.token) {
              receivedAnyToken = true;
              accumulated += parsed.token;
              scheduleFlush();
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // Final flush in case anything is pending
      flushNow();

      // ── Stream ended — ensure proper state ──
      if (!receivedDone) {
        console.warn('[chat] Stream ended without [DONE] marker');
        if (receivedAnyToken && accumulated.trim()) {
          // We got content but no DONE — mark as complete
          setMessages(prev => prev.map(m =>
            m.id === optAsstId ? { ...m, status: 'complete' as const } : m
          ));
        } else {
          // Stream closed with NO content at all — start recovery polling
          // The n8n agent may still be working and will write to the DB eventually
          console.warn('[chat] Stream closed with no content. Starting recovery...');
          setMessages(prev => prev.map(m =>
            m.id === optAsstId
              ? { ...m, steps: [...(m.steps || []), 'Aguardando resposta do agente...'], status: 'streaming' as const }
              : m
          ));
          startRecovery(sessionId, optAsstId, trimmed);
          // Don't set sending=false yet — recovery will handle it
          invokeInProgressRef.current = false;
          clearTimeout(timeout);
          abortRef.current = null;
          return true;
        }
      }

      return true;
    } catch (err: any) {
      console.error('Erro ao enviar:', err);
      
      if (err.name === 'AbortError') {
        // Timeout — but the agent might still be working on the backend
        // Start recovery polling instead of showing error immediately
        console.warn('[chat] Request timed out. Starting recovery polling...');
        setMessages(prev => prev.map(m =>
          m.id === optAsstId
            ? { ...m, steps: [...(m.steps || []), 'Aguardando resposta do agente...'], status: 'streaming' as const }
            : m
        ));
        startRecovery(sessionId, optAsstId, trimmed);
        invokeInProgressRef.current = false;
        clearTimeout(timeout);
        abortRef.current = null;
        return true;
      }

      const errorMsg = 'Não foi possível enviar sua mensagem. Tente novamente.';
      setMessages(prev => prev.map(m =>
        m.id === optAsstId
          ? { ...m, content: '', status: 'error' as const, error_detail: errorMsg }
          : m
      ));
      return false;
    } finally {
      clearTimeout(timeout);
      invokeInProgressRef.current = false;
      // Only set sending=false if recovery is NOT active
      if (!recoveryTimerRef.current) {
        setSending(false);
      }
      abortRef.current = null;
    }
  }, [sessionId, startRecovery, clearRecovery]);

  const retryMessage = useCallback(async (errorMessageId: string) => {
    const errorIndex = messages.findIndex(m => m.id === errorMessageId);
    if (errorIndex === -1) return;

    const userMessage = messages
      .slice(0, errorIndex)
      .reverse()
      .find(m => m.role === 'user');

    if (!userMessage) return;

    if (!errorMessageId.startsWith('opt-')) {
      await supabase.from('chat_messages').delete().eq('id', errorMessageId);
    }
    const userMsgId = userMessage.id;
    if (!userMsgId.startsWith('opt-')) {
      await supabase.from('chat_messages').delete().eq('id', userMsgId);
    }
    setMessages(prev => prev.filter(m => m.id !== errorMessageId && m.id !== userMsgId));

    await sendMessage(userMessage.content);
  }, [messages, sendMessage]);

  return { messages, loading, sending, sendMessage, retryMessage };
}
