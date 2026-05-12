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
  // legacy/unused fields kept for compat
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
const CLIENT_TIMEOUT_MS = 70_000;

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
          setMessages((data ?? []) as ChatMessage[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ── Realtime sync between tabs ─────────────────────────────────────────────
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

  // ── Remove only ERROR messages (used before retry / on demand) ────────────
  const clearErrors = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.status !== 'error'));
  }, []);

  // ── Send message via direct fetch (full control over timeout) ─────────────
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

      // Limpa erros do estado local (lixo visual) ANTES de enviar
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
            status: 'pending',
            created_at: now,
            startedAt: startTs,
          },
        ];
      });

      toast('Pergunta enviada ao agente', { duration: 1800 });

      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);

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
        if (!resp.ok) {
          throw new Error(data?.error || `HTTP ${resp.status}`);
        }

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
        const elapsed = Math.round((Date.now() - startTs) / 1000);
        const aborted = e?.name === 'AbortError';
        const detail = aborted
          ? `Sem resposta após ${elapsed}s. Verifique se o workflow do n8n está ativo.`
          : e?.message?.includes('Failed to fetch')
            ? 'Não foi possível alcançar o servidor. Verifique sua conexão.'
            : `Falha ao enviar: ${e?.message ?? 'erro desconhecido'}`;
        console.error('sendMessage failed', e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  status: 'error',
                  content: detail,
                  error_detail: detail,
                }
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
    [sessionId],
  );

  // ── Retry: resend the user message that precedes a failed assistant ───────
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
