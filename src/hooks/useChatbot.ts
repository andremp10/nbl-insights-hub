import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const WEBHOOK_URL = 'https://primary-production-c00b.up.railway.app/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';
const TIMEOUT_MS = 60000;
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

function normalizeResponse(raw: string): { text: string; highlights?: ChatHighlight[]; suggestedActions?: SuggestedAction[]; chartPayloads?: ChartPayload[] } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.reply?.text) return { text: parsed.reply.text, highlights: parsed.reply.highlights, suggestedActions: parsed.reply.suggested_actions, chartPayloads: parsed.reply.chart_payloads };
    if (parsed.text) return { text: parsed.text, highlights: parsed.highlights, suggestedActions: parsed.suggested_actions, chartPayloads: parsed.chart_payloads };
    if (parsed.output) return { text: typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output) };
    if (typeof parsed === 'string') return { text: parsed };
    return { text: JSON.stringify(parsed, null, 2) };
  } catch {
    return { text: raw || 'Resposta vazia do servidor.' };
  }
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
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'grafica_nbl_lovable',
          session_id: SESSION_ID,
          timezone: 'America/Fortaleza',
          message: content.trim(),
          context: { active_module: 'chat' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const rawText = await res.text();
      const normalized = normalizeResponse(rawText);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: normalized.text,
        timestamp: new Date().toISOString(),
        highlights: normalized.highlights,
        suggestedActions: normalized.suggestedActions,
        chartPayloads: normalized.chartPayloads,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === 'AbortError') {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'A consulta excedeu o tempo limite de 60 segundos. Tente uma pergunta mais simples.',
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
