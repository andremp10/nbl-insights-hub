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
  steps?: string[];
  startedAt?: number;
  // async v4
  request_id?: string | null;
  client_request_id?: string | null;
  reply_to_message_id?: string | null;
  processing_started_at?: string | null;
  softTimeout?: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const ASYNC_MODE = (import.meta.env.VITE_CHAT_ASYNC_MODE as string) === 'true';

const STREAM_TIMEOUT_MS = 6 * 60 * 1000; // legacy SSE
const RECOVERY_POLL_MS = 10_000;
const RECOVERY_MAX_MS = 5 * 60 * 1000;

// async v4 timeouts
const ASYNC_POLL_MS = 8_000;
const ASYNC_SOFT_TIMEOUT_MS = 6 * 60 * 1000;
const ASYNC_HARD_TIMEOUT_MS = 12 * 60 * 1000;

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const invokeInProgressRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // async v4: poll timers per assistant_message_id
  const asyncPollersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const asyncTimersRef = useRef<Map<string, { soft: ReturnType<typeof setTimeout>; hard: ReturnType<typeof setTimeout> }>>(new Map());

  const clearRecovery = useCallback(() => {
    if (recoveryTimerRef.current) {
      clearInterval(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const stopAsyncTracking = useCallback((assistantId: string) => {
    const poller = asyncPollersRef.current.get(assistantId);
    if (poller) clearInterval(poller);
    asyncPollersRef.current.delete(assistantId);
    const timers = asyncTimersRef.current.get(assistantId);
    if (timers) {
      clearTimeout(timers.soft);
      clearTimeout(timers.hard);
    }
    asyncTimersRef.current.delete(assistantId);
  }, []);

  const stopAllAsyncTracking = useCallback(() => {
    asyncPollersRef.current.forEach((p) => clearInterval(p));
    asyncPollersRef.current.clear();
    asyncTimersRef.current.forEach((t) => {
      clearTimeout(t.soft);
      clearTimeout(t.hard);
    });
    asyncTimersRef.current.clear();
  }, []);

  // ── Async tracking: Realtime já cobre via canal global; aqui só polling fallback + timers
  const startAsyncTracking = useCallback((assistantId: string, processingStartedAt?: string) => {
    if (asyncPollersRef.current.has(assistantId)) return;

    // Polling fallback
    const poller = setInterval(async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, status, content, error_detail, processing_started_at, completed_at, updated_at')
        .eq('id', assistantId)
        .maybeSingle();
      if (!data) return;
      if (data.status !== 'processing') {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, ...(data as Partial<ChatMessage>) } : m))
        );
        stopAsyncTracking(assistantId);
        setSending(false);
      }
    }, ASYNC_POLL_MS);
    asyncPollersRef.current.set(assistantId, poller);

    // Soft + hard timers, calculados a partir de processing_started_at se existir
    const startMs = processingStartedAt ? new Date(processingStartedAt).getTime() : Date.now();
    const elapsed = Date.now() - startMs;
    const softDelay = Math.max(0, ASYNC_SOFT_TIMEOUT_MS - elapsed);
    const hardDelay = Math.max(0, ASYNC_HARD_TIMEOUT_MS - elapsed);

    const soft = setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, softTimeout: true } : m)));
    }, softDelay);

    const hard = setTimeout(async () => {
      // Servidor decide se realmente expira (RPC tem proteção de 12min)
      try {
        await supabase.rpc('report_client_timeout', { p_assistant_id: assistantId });
      } catch (e) {
        console.warn('[chat-async] report_client_timeout failed', e);
      }
    }, hardDelay);

    asyncTimersRef.current.set(assistantId, { soft, hard });
  }, [stopAsyncTracking]);

  // Load history + subscribe to Realtime
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setSending(false);
    invokeInProgressRef.current = false;
    stopAllAsyncTracking();

    supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const msgs = data as ChatMessage[];
          setMessages(msgs);
          // pending (legado SSE) ou processing (async) ⇒ marca sending
          const hasInFlight = msgs.some((m) => m.status === 'pending' || m.status === 'processing');
          if (hasInFlight) setSending(true);

          if (ASYNC_MODE) {
            // Reata tracking para mensagens processing carregadas do DB
            msgs
              .filter((m) => m.role === 'assistant' && m.status === 'processing')
              .forEach((m) => startAsyncTracking(m.id, m.processing_started_at ?? undefined));
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
          // Reconcile optimistic messages by content (legacy)
          const optIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.role === newMsg.role && m.content === newMsg.content);
          if (optIdx !== -1) {
            const copy = [...prev];
            copy[optIdx] = newMsg;
            return copy;
          }
          // Legacy recovery
          if (newMsg.role === 'assistant' && (newMsg.status === 'complete' || newMsg.status === 'error')) {
            const streamingIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.role === 'assistant' && (m.status === 'streaming' || m.status === 'pending'));
            if (streamingIdx !== -1) {
              const copy = [...prev];
              copy[streamingIdx] = newMsg;
              setSending(false);
              clearRecovery();
              return copy;
            }
          }
          // Phantom-error suppression: if a 'complete' assistant message landed in the
          // last 30s, discard any subsequent 'error' for the same session (race from
          // legacy SSE proxy when the client disconnected mid-flush).
          if (newMsg.role === 'assistant' && newMsg.status === 'error') {
            const newTs = new Date(newMsg.created_at).getTime();
            const hasRecentComplete = prev.some(m =>
              m.role === 'assistant' &&
              m.status === 'complete' &&
              Math.abs(newTs - new Date(m.created_at).getTime()) < 30_000
            );
            if (hasRecentComplete) return prev;
          }
          // Inverse: if a 'complete' arrives and there is a recent 'error' phantom, drop the phantom.
          if (newMsg.role === 'assistant' && newMsg.status === 'complete') {
            const newTs = new Date(newMsg.created_at).getTime();
            const filtered = prev.filter(m => !(
              m.role === 'assistant' &&
              m.status === 'error' &&
              Math.abs(newTs - new Date(m.created_at).getTime()) < 30_000
            ));
            const exists = filtered.some(m => m.id === newMsg.id);
            return exists ? filtered : [...filtered, newMsg];
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
        if (updated.status !== 'pending' && updated.status !== 'processing') {
          setSending(false);
          if (ASYNC_MODE) stopAsyncTracking(updated.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      abortRef.current?.abort();
      clearRecovery();
      stopAllAsyncTracking();
    };
  }, [sessionId, clearRecovery, startAsyncTracking, stopAsyncTracking, stopAllAsyncTracking]);

  // ── Recovery polling (legacy SSE only)
  const startRecovery = useCallback((sid: string, optAsstId: string, _userContent: string) => {
    clearRecovery();
    const startedAt = Date.now();
    recoveryTimerRef.current = setInterval(async () => {
      if (Date.now() - startedAt > RECOVERY_MAX_MS) {
        clearRecovery();
        setMessages(prev => prev.map(m =>
          m.id === optAsstId && (m.status === 'streaming' || m.status === 'pending')
            ? { ...m, status: 'error' as const, error_detail: 'A consulta demorou mais que o esperado. Por favor, tente com um período menor ou reformule a pergunta.' }
            : m
        ));
        setSending(false);
        return;
      }
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && (data.status === 'complete' || data.status === 'error') && data.content) {
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

  // ════════════════════════════════════════════════════════════════
  // ASYNC v4 sender
  // ════════════════════════════════════════════════════════════════
  const sendMessageAsync = useCallback(async (content: string): Promise<boolean> => {
    if (invokeInProgressRef.current) return false;
    if (!content.trim() || !sessionId) return false;

    invokeInProgressRef.current = true;
    setSending(true);

    const trimmed = content.trim();
    const optUserId = `opt-user-${Date.now()}`;
    const optAsstId = `opt-asst-${Date.now()}`;
    const now = new Date().toISOString();
    const clientRequestId = (crypto as any).randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    setMessages((prev) => [
      ...prev,
      { id: optUserId, session_id: sessionId, role: 'user', content: trimmed, status: 'complete', created_at: now, client_request_id: clientRequestId },
      { id: optAsstId, session_id: sessionId, role: 'assistant', content: '', status: 'processing', created_at: now, processing_started_at: now },
    ]);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token || '';

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/nlq-proxy-async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId,
          client_request_id: clientRequestId,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(errText || `HTTP ${resp.status}`);
      }

      const json = await resp.json() as {
        user_message_id: string;
        assistant_message_id: string;
        request_id: string;
        status: 'processing' | 'error' | 'complete';
        ack_timeout?: boolean;
        is_duplicate?: boolean;
      };

      // Substitui IDs otimistas pelos reais
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === optUserId) return { ...m, id: json.user_message_id };
          if (m.id === optAsstId) {
            return {
              ...m,
              id: json.assistant_message_id,
              status: json.status,
              request_id: json.request_id,
              reply_to_message_id: json.user_message_id,
            };
          }
          return m;
        })
      );

      if (json.status === 'error') {
        setSending(false);
        return false;
      }

      // Inicia tracking (Realtime do canal já está rodando; isto é polling fallback + timers)
      startAsyncTracking(json.assistant_message_id);
      return true;
    } catch (err: any) {
      console.error('[chat-async] dispatch failed', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optAsstId
            ? { ...m, status: 'error' as const, error_detail: 'Não foi possível enviar sua mensagem. Tente novamente.' }
            : m
        )
      );
      setSending(false);
      return false;
    } finally {
      invokeInProgressRef.current = false;
    }
  }, [sessionId, startAsyncTracking]);

  // ════════════════════════════════════════════════════════════════
  // LEGACY SSE sender (intacto)
  // ════════════════════════════════════════════════════════════════
  const sendMessageLegacy = useCallback(async (content: string): Promise<boolean> => {
    if (invokeInProgressRef.current) return false;
    if (!content.trim() || !sessionId) return false;

    invokeInProgressRef.current = true;
    setSending(true);

    const trimmed = content.trim();
    const optUserId = `opt-user-${Date.now()}`;
    const optAsstId = `opt-asst-${Date.now()}`;
    const now = new Date().toISOString();

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
            if (parsed.token) {
              receivedAnyToken = true;
              accumulated += parsed.token;
              scheduleFlush();
            }
          } catch {
            // skip
          }
        }
      }

      flushNow();

      if (!receivedDone) {
        if (receivedAnyToken && accumulated.trim()) {
          setMessages(prev => prev.map(m =>
            m.id === optAsstId ? { ...m, status: 'complete' as const } : m
          ));
        } else {
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
      }

      return true;
    } catch (err: any) {
      console.error('Erro ao enviar:', err);

      if (err.name === 'AbortError') {
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
      if (!recoveryTimerRef.current) {
        setSending(false);
      }
      abortRef.current = null;
    }
  }, [sessionId, startRecovery]);

  const sendMessage = ASYNC_MODE ? sendMessageAsync : sendMessageLegacy;

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
