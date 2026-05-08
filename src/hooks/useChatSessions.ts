import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  user_id: string;
}

const PIN_STORAGE_KEY = 'nbl_pinned_sessions';

function loadPinned(): Set<string> {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadPinned());
  const { user } = useAuth();
  const userId = user?.id;
  const creatingRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('[useChatSessions] fetchSessions error:', error.message, error.code);
    }
    if (!error && data) setSessions(data as ChatSession[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSessions();

    const sub = supabase
      .channel('chat_sessions_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_sessions',
      }, (payload) => {
        const newSession = payload.new as ChatSession;
        if (newSession.user_id !== userId) return;
        setSessions(prev => {
          if (prev.some(s => s.id === newSession.id)) return prev;
          return [newSession, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_sessions',
      }, (payload) => {
        const updated = payload.new as ChatSession;
        if (updated.user_id !== userId) return;
        setSessions(prev => {
          const idx = prev.findIndex(s => s.id === updated.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          // Re-sort by last_message_at desc
          next.sort((a, b) => {
            const aTime = a.last_message_at || a.created_at;
            const bTime = b.last_message_at || b.created_at;
            return bTime.localeCompare(aTime);
          });
          return next;
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_sessions',
      }, (payload) => {
        const deleted = payload.old as { id: string };
        setSessions(prev => prev.filter(s => s.id !== deleted.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchSessions, userId]);

  const createSession = useCallback(async (): Promise<ChatSession | null> => {
    if (!userId) return null;
    if (creatingRef.current) {
      console.warn('[useChatSessions] createSession already in progress, skipping');
      return null;
    }
    creatingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: userId, title: 'Nova conversa' })
        .select()
        .single();

      if (error || !data) {
        console.error('[useChatSessions] createSession error:', error?.message, error?.code, error?.details);
        return null;
      }

      const session = data as ChatSession;
      setSessions(prev => {
        if (prev.some(s => s.id === session.id)) return prev;
        return [session, ...prev];
      });
      return session;
    } finally {
      creatingRef.current = false;
    }
  }, [userId]);

  const deleteSession = useCallback(async (sessionId: string) => {
    await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    await supabase.from('chat_sessions').delete().eq('id', sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    const trimmed = title.trim().slice(0, 60);
    if (!trimmed) return;
    setSessions(prev => prev.map((s: ChatSession) => s.id === sessionId ? { ...s, title: trimmed } : s));
    await supabase.from('chat_sessions').update({ title: trimmed }).eq('id', sessionId);
  }, []);

  const togglePinSession = useCallback((sessionId: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      try { localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, []);

  const groupedSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, ChatSession[]> = {
      'Fixadas': [],
      'Hoje': [],
      'Ontem': [],
      'Esta semana': [],
      'Mais antigas': [],
    };

    sessions.forEach(session => {
      if (pinnedIds.has(session.id)) {
        groups['Fixadas'].push(session);
        return;
      }
      const date = new Date(session.last_message_at || session.created_at);
      date.setHours(0, 0, 0, 0);
      if (date >= today) groups['Hoje'].push(session);
      else if (date >= yesterday) groups['Ontem'].push(session);
      else if (date >= weekAgo) groups['Esta semana'].push(session);
      else groups['Mais antigas'].push(session);
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [sessions, pinnedIds]);

  return { sessions, loading, groupedSessions, pinnedIds, togglePinSession, createSession, deleteSession, updateSessionTitle, refetch: fetchSessions };
}

