import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  user_id: string;
}

const DEVICE_ID_KEY = 'nbl_device_id';

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceId = useMemo(() => getDeviceId(), []);

  const fetchSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', deviceId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (!error && data) setSessions(data as ChatSession[]);
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    fetchSessions();

    const sub = supabase
      .channel('chat_sessions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_sessions',
      }, () => fetchSessions())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [fetchSessions]);

  const createSession = useCallback(async (): Promise<ChatSession | null> => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: deviceId, title: 'Nova conversa' })
      .select()
      .single();

    if (error || !data) return null;
    const session = data as ChatSession;
    setSessions(prev => [session, ...prev]);
    return session;
  }, [deviceId]);

  const deleteSession = useCallback(async (sessionId: string) => {
    // Delete messages first, then session
    await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    await supabase.from('chat_sessions').delete().eq('id', sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const groupedSessions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: Record<string, ChatSession[]> = {
      'Hoje': [],
      'Ontem': [],
      'Esta semana': [],
      'Mais antigas': [],
    };

    sessions.forEach(session => {
      const date = new Date(session.last_message_at || session.created_at);
      date.setHours(0, 0, 0, 0);
      if (date >= today) groups['Hoje'].push(session);
      else if (date >= yesterday) groups['Ontem'].push(session);
      else if (date >= weekAgo) groups['Esta semana'].push(session);
      else groups['Mais antigas'].push(session);
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [sessions]);

  return { sessions, loading, groupedSessions, createSession, deleteSession, refetch: fetchSessions };
}
