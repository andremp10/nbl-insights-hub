import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

const TIMEOUT_MS = 180000; // 180s — acima dos 150s da Edge Function
const STORAGE_KEY = 'nbl_chat_history';
const MAX_MESSAGES = 50;

export interface ChatHighlight {
  label: string;
  value: number;
}

export interface SuggestedAction {
  type: 'set_date_range' | 'open_module';
  from?: string;
  to?: string;
  module?: string;
}

export interface ChartPayload {
  chart: string;
  title: string;
  series: { name: string; value: number }[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  highlights?: ChatHighlight[];
  suggestedActions?: SuggestedAction[];
  chartPayloads?: ChartPayload[];
  isError?: boolean;
}

const SESSION_ID = localStorage.getItem('nbl_chat_session') || (() => {
  const id = uuidv4();
  localStorage.setItem('nbl_chat_session', id);
  return id;
})();

const WELCOME_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: 'Olá! 👋 Sou o assistente da **NBL Gráfica**.\n\nPergunte sobre pedidos, clientes, financeiro, produtos e mais.',
  timestamp: new Date().toISOString(),
};

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Message[];
      return parsed.length > 0 ? parsed : [WELCOME_MESSAGE];
    }
  } catch { /* ignore */ }
  return [WELCOME_MESSAGE];
}

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_MESSAGES)));
  } catch { /* ignore */ }
}


export function useChatbot() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Persist messages
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const payload = {
        session_id: SESSION_ID,
        timezone: 'America/Fortaleza',
        message: content.trim(),
        context: { active_module: 'chat' },
      };

      // Race between supabase invoke and timeout
      const invokePromise = supabase.functions.invoke('nlq-proxy', { body: payload });
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS);
      });

      const { data, error: invokeError } = await Promise.race([invokePromise, timeoutPromise]) as Awaited<typeof invokePromise>;
      clearTimeout(timeoutId);

      if (invokeError) throw new Error(invokeError.message || 'Erro na comunicação com o agente');

      // Edge Function retorna { ok, reply, error }
      const response = data as { ok: boolean; reply?: { text: string; highlights?: ChatHighlight[]; suggested_actions?: SuggestedAction[]; chart_payloads?: ChartPayload[] }; error?: { code: string; message: string } };

      if (!response?.ok || !response.reply?.text) {
        throw new Error(response?.error?.message || 'Resposta vazia do agente.');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply.text,
        timestamp: new Date().toISOString(),
        highlights: response.reply.highlights,
        suggestedActions: response.reply.suggested_actions,
        chartPayloads: response.reply.chart_payloads,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = (err as Error).message === 'TIMEOUT' || (err as Error).name === 'AbortError';
      if (isTimeout) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'A consulta excedeu o tempo limite. O agente pode estar processando uma query complexa. Tente novamente ou faça uma pergunta mais simples.',
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages(prev => [...prev, errorMsg]);
      } else {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Não foi possível processar sua consulta. Tente novamente.',
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading]);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, id: Date.now().toString(), timestamp: new Date().toISOString() }]);
  }, []);

  return { messages, isLoading, sendMessage, cancelRequest, clearMessages };
}
