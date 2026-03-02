import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { SessionsSidebar } from '@/components/chat/SessionsSidebar';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useChatMessages } from '@/hooks/useChatMessages';

export default function Chat() {
  const { sessions, groupedSessions, createSession, deleteSession, loading: sessionsLoading } = useChatSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { messages, loading: messagesLoading, sending, sendMessage, retryMessage } = useChatMessages(currentSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingHandled = useRef(false);
  const [suggestionText, setSuggestionText] = useState('');
  const bootstrapTriedRef = useRef(false);
  const pendingToSendRef = useRef<string | null>(null);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;
    const s = await createSession();
    if (s) { setCurrentSessionId(s.id); return s.id; }
    return null;
  }, [currentSessionId, createSession]);

  useEffect(() => {
    if (sessionsLoading || currentSessionId || bootstrapTriedRef.current) return;
    bootstrapTriedRef.current = true;
    if (sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    } else {
      createSession().then(s => { if (s) setCurrentSessionId(s.id); });
    }
  }, [sessions, sessionsLoading, currentSessionId, createSession]);

  useEffect(() => {
    if (!currentSessionId || !pendingToSendRef.current) return;
    const msg = pendingToSendRef.current;
    pendingToSendRef.current = null;
    sendMessage(msg);
  }, [currentSessionId, sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (!currentSessionId || pendingHandled.current) return;
    const pending = localStorage.getItem('nbl_pending_query');
    if (pending) {
      pendingHandled.current = true;
      localStorage.removeItem('nbl_pending_query');
      setTimeout(() => sendMessage(pending), 300);
    }
  }, [currentSessionId, sendMessage]);

  const handleNewSession = useCallback(async () => {
    const s = await createSession();
    if (s) setCurrentSessionId(s.id);
  }, [createSession]);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
    if (id === currentSessionId) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        const s = await createSession();
        if (s) setCurrentSessionId(s.id);
      }
    }
  }, [currentSessionId, sessions, deleteSession, createSession]);

  const handleSend = useCallback(async (msg: string): Promise<boolean> => {
    if (currentSessionId) return sendMessage(msg);
    pendingToSendRef.current = msg;
    const sid = await ensureSession();
    if (!sid) { pendingToSendRef.current = null; return false; }
    return true;
  }, [currentSessionId, sendMessage, ensureSession]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 min-h-0">
      <SessionsSidebar
        groupedSessions={groupedSessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onCreateSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        loading={sessionsLoading}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth" role="log" aria-live="polite">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground animate-pulse">Carregando mensagens...</p>
            </div>
          ) : !hasMessages && !sending ? (
            <ChatEmptyState onSuggestionClick={(text) => setSuggestionText(text)} />
          ) : (
            <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRetry={message.status === 'error' ? () => retryMessage(message.id) : undefined}
                />
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
        </div>

        <ChatInputInline
          onSend={handleSend}
          sending={sending}
          suggestionText={suggestionText}
          onSuggestionConsumed={() => setSuggestionText('')}
        />
      </div>
    </div>
  );
}

function ChatInputInline({
  onSend, sending, suggestionText, onSuggestionConsumed,
}: {
  onSend: (msg: string) => Promise<boolean>;
  sending: boolean;
  suggestionText: string;
  onSuggestionConsumed: () => void;
}) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef(false);

  useEffect(() => {
    if (suggestionText) {
      setInput(suggestionText);
      onSuggestionConsumed();
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [suggestionText, onSuggestionConsumed]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitRef.current || sending || !input.trim()) return;
    submitRef.current = true;
    const msg = input.trim();
    try {
      const ok = await onSend(msg);
      if (ok) {
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
    } finally {
      submitRef.current = false;
    }
  }, [input, sending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !sending) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-sidebar-background px-4 py-3 md:px-8">
      <div className="w-full max-w-3xl mx-auto">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            disabled={sending}
            onChange={(e) => { if (!sending) { setInput(e.target.value); adjustHeight(); } }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo sobre pedidos, clientes, financeiro..."
            rows={1}
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            aria-label="Campo de mensagem"
          />
          <div className="absolute right-2 bottom-2">
            <button
              onClick={handleSubmit}
              disabled={sending || !input.trim()}
              aria-label="Enviar mensagem"
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                !sending && input.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
        {sending && (
          <p className="text-center text-xs text-muted-foreground mt-2 animate-pulse">
            Aguardando resposta...
          </p>
        )}
      </div>
    </div>
  );
}
