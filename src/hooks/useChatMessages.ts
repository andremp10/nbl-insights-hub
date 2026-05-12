import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  request_id?: string | null;
  client_request_id?: string | null;
  reply_to_message_id?: string | null;
  processing_started_at?: string | null;
  softTimeout?: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const NLQ_CHAT_URL = `${SUPABASE_URL}/functions/v1/nlq-chat`;
const INITIAL_ACK_TIMEOUT_MS = 15_000; // edge function should ack in <2s
const CLIENT_HARD_TIMEOUT_MS = 12 * 60_000; // safety net

function makeRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function withStartedAt(m: ChatMessage): ChatMessage {
  if (m.role !== 'assistant') return m;
  if (m.status !== 'processing' && m.status !== 'pending' && m.status !== 'streaming') return m;
  if (m.startedAt) return m;
  const ts = m.processing_started_at ?? m.created_at;
  const parsed = ts ? Date.parse(ts) : NaN;
  return { ...m, startedAt: Number.isFinite(parsed) ? parsed : Date.now() };
}

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const safetyTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pollersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const clearPoller = useCallback((assistantId: string) => {
    const p = pollersRef.current.get(assistantId);
    if (p) {
      clearInterval(p);
      pollersRef.current.delete(assistantId);
    }
  }, []);

  const armPoller = useCallback((assistantId: string) => {
    if (pollersRef.current.has(assistantId)) return;
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, content, status, error_detail, completed_at, processing_started_at')
        .eq('id', assistantId)
        .maybeSingle();
      if (error) return;
      if (!data) return;
      if (data.status === 'complete' || data.status === 'error') {
        setMessages((prev) =>
          prev.map((x) => (x.id === assistantId ? { ...x, ...(data as Partial<ChatMessage>) } : x)),
        );
        clearPoller(assistantId);
      }
    }, 5000);
    pollersRef.current.set(assistantId, interval);
  }, [clearPoller]);

  const armSafetyTimer = useCallback((assistantId: string) => {
    const timers = safetyTimersRef.current;
    const existing = timers.get(assistantId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && (m.status === 'processing' || m.status === 'pending')
            ? {
                ...m,
                status: 'error',
                error_detail:
                  'A consulta demorou mais que o esperado. Tente reformular ou reduzir o período.',
                content:
                  'A consulta demorou mais que o esperado. Tente reformular ou reduzir o período.',
              }
            : m,
        ),
      );
      timers.delete(assistantId);
    }, CLIENT_HARD_TIMEOUT_MS);
    timers.set(assistantId, t);
  }, []);

  const clearSafetyTimer = useCallback((assistantId: string) => {
    const timers = safetyTimersRef.current;
    const t = timers.get(assistantId);
    if (t) {
      clearTimeout(t);
      timers.delete(assistantId);
    }
  }, []);

  // ── Load history ────────────────────────────────────────────────────────────
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
          const list = ((data ?? []) as ChatMessage[]).map(withStartedAt);
          setMessages(list);
          // re-arm safety nets and pollers for any in-flight assistant messages
          list.forEach((m) => {
            if (m.role === 'assistant' && m.status === 'processing') {
              armSafetyTimer(m.id);
              armPoller(m.id);
            }
          });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, armSafetyTimer, armPoller]);

  // ── Realtime sync ──────────────────────────────────────────────────────────
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
          const m = withStartedAt(payload.new as ChatMessage);
          setMessages((prev) => {
            // Dedupe by id
            if (prev.some((x) => x.id === m.id)) return prev;
            // Dedupe by client_request_id (replaces optimistic temp message)
            if (m.client_request_id) {
              const tempIdx = prev.findIndex(
                (x) => x.client_request_id === m.client_request_id && x.role === m.role && x.id.startsWith('temp-'),
              );
              if (tempIdx !== -1) {
                const next = prev.slice();
                next[tempIdx] = { ...prev[tempIdx], ...m, startedAt: prev[tempIdx].startedAt };
                return next;
              }
            }
            // Dedupe assistant by reply_to_message_id matching a temp assistant
            if (m.role === 'assistant' && m.reply_to_message_id) {
              const tempIdx = prev.findIndex(
                (x) => x.role === 'assistant' && x.id.startsWith('temp-asst-'),
              );
              if (tempIdx !== -1) {
                const next = prev.slice();
                next[tempIdx] = { ...prev[tempIdx], ...m, startedAt: prev[tempIdx].startedAt };
                return next;
              }
            }
            return [...prev, m];
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m, startedAt: x.startedAt } : x)));
          if (m.status === 'complete' || m.status === 'error') {
            clearSafetyTimer(m.id);
            clearPoller(m.id);
          }
        },
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [sessionId, clearSafetyTimer, clearPoller]);

  // Cleanup all safety timers and pollers on unmount
  useEffect(() => {
    return () => {
      safetyTimersRef.current.forEach((t) => clearTimeout(t));
      safetyTimersRef.current.clear();
      pollersRef.current.forEach((p) => clearInterval(p));
      pollersRef.current.clear();
    };
  }, []);

  const clearErrors = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.status !== 'error'));
  }, []);

  // ── Send: fire-and-forget; resposta vem via Realtime ──────────────────────
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const text = content.trim();
      if (!text || !sessionId || sendingRef.current) return false;
      sendingRef.current = true;
      setSending(true);

      const clientRequestId = makeRequestId();
      const tempUserId = `temp-user-${clientRequestId}`;
      const tempAssistantId = `temp-asst-${clientRequestId}`;
      const startTs = Date.now();
      const now = new Date(startTs).toISOString();

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.status !== 'error');
        return [
          ...filtered,
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
            status: 'processing',
            created_at: now,
            startedAt: startTs,
            processing_started_at: now,
          },
        ];
      });

      toast('Pergunta enviada ao agente', { duration: 1800 });

      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), INITIAL_ACK_TIMEOUT_MS);

      try {
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess?.session?.access_token;
        if (!accessToken) throw new Error('Não autenticado');

        const resp = await fetch(NLQ_CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            message: text,
            client_request_id: clientRequestId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Fortaleza',
          }),
          signal: ctrl.signal,
        });

        const data = await resp.json().catch(() => null);
        if (!resp.ok && resp.status !== 202) {
          throw new Error(data?.error || `HTTP ${resp.status}`);
        }

        const realAssistantId: string = data?.assistant_id ?? tempAssistantId;
        const realUserId: string = data?.user_message_id ?? tempUserId;
        const procStartedAt: string | undefined = data?.processing_started_at;
        const procStartTs = procStartedAt ? Date.parse(procStartedAt) : startTs;

        // Duplicate (idempotency hit) — backend already has the answer
        if (data?.duplicate && data?.reply?.text) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === tempUserId) return { ...m, id: realUserId };
              if (m.id === tempAssistantId) {
                return {
                  ...m,
                  id: realAssistantId,
                  content: data.reply.text,
                  status: data.status ?? 'complete',
                  error_detail: data.error_detail ?? null,
                };
              }
              return m;
            }),
          );
          return true;
        }

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === tempUserId) return { ...m, id: realUserId };
            if (m.id === tempAssistantId) {
              return {
                ...m,
                id: realAssistantId,
                status: 'processing',
                startedAt: Number.isFinite(procStartTs) ? procStartTs : startTs,
                processing_started_at: procStartedAt ?? now,
              };
            }
            return m;
          }),
        );
        armSafetyTimer(realAssistantId);
        armPoller(realAssistantId);
        return true;
      } catch (e: any) {
        const aborted = e?.name === 'AbortError';
        const detail = aborted
          ? 'Não foi possível confirmar o envio (timeout). Tente novamente.'
          : e?.message?.includes('Failed to fetch')
            ? 'Não foi possível alcançar o servidor. Verifique sua conexão.'
            : `Falha ao enviar: ${e?.message ?? 'erro desconhecido'}`;
        console.error('sendMessage failed', e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? { ...m, status: 'error', content: detail, error_detail: detail }
              : m,
          ),
        );
        return false;
      } finally {
        clearTimeout(timeoutId);
        sendingRef.current = false;
        setSending(false);
      }
    },
    [sessionId, armSafetyTimer, armPoller],
  );

  const retryMessage = useCallback(
    async (assistantId: string): Promise<boolean> => {
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx <= 0) return false;
      let userMsg: ChatMessage | null = null;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          userMsg = messages[i];
          break;
        }
      }
      if (!userMsg) return false;
      setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg!.id));
      return sendMessage(userMsg.content);
    },
    [messages, sendMessage],
  );

  return { messages, loading, sending, sendMessage, retryMessage, clearErrors };
}
