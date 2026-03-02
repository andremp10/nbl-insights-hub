import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { SessionsSidebar } from '@/components/chat/SessionsSidebar';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useChatMessages } from '@/hooks/useChatMessages';

export default function Chat() {
  const { sessions, groupedSessions, createSession, deleteSession, updateSessionTitle, loading: sessionsLoading } = useChatSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { messages, loading: messagesLoading, sending, sendMessage, retryMessage } = useChatMessages(currentSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMsgIdsRef = useRef<Set<string>>(new Set());
  const hasSetInitialRef = useRef(false);
  const pendingHandled = useRef(false);
  const [suggestionText, setSuggestionText] = useState('');
  const pendingToSendRef = useRef<string | null>(null);
  const pendingAutoTitleRef = useRef<string | null>(null);

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;
    const s = await createSession();
    if (s) { setCurrentSessionId(s.id); return s.id; }
    return null;
  }, [currentSessionId, createSession]);

  // Track initial message IDs to avoid animating history
  useEffect(() => {
    if (!messagesLoading && messages.length > 0 && !hasSetInitialRef.current) {
      hasSetInitialRef.current = true;
      initialMsgIdsRef.current = new Set(messages.map(m => m.id));
    }
    if (currentSessionId && hasSetInitialRef.current === false && !messagesLoading && messages.length === 0) {
      hasSetInitialRef.current = true;
    }
  }, [messages, messagesLoading, currentSessionId]);

  // Reset tracking when session changes
  useEffect(() => {
    hasSetInitialRef.current = false;
    initialMsgIdsRef.current = new Set();
  }, [currentSessionId]);

  // Send pending message after session is created
  useEffect(() => {
    if (!currentSessionId || !pendingToSendRef.current) return;
    const msg = pendingToSendRef.current;
    pendingToSendRef.current = null;
    sendMessage(msg);
  }, [currentSessionId, sendMessage]);

  // Apply pending auto-title after session is created
  useEffect(() => {
    if (!currentSessionId || !pendingAutoTitleRef.current) return;
    const title = pendingAutoTitleRef.current;
    pendingAutoTitleRef.current = null;
    updateSessionTitle(currentSessionId, title);
  }, [currentSessionId, updateSessionTitle]);

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
    const isFirstUserMessage = messages.filter(m => m.role === 'user').length === 0;

    if (currentSessionId) {
      const ok = await sendMessage(msg);
      if (ok && isFirstUserMessage) {
        const session = sessions.find(s => s.id === currentSessionId);
        if (session?.title === 'Nova conversa') {
          updateSessionTitle(currentSessionId, msg.slice(0, 50));
        }
      }
      return ok;
    }

    // No session yet — create one and queue the message
    if (isFirstUserMessage) pendingAutoTitleRef.current = msg.slice(0, 50);
    pendingToSendRef.current = msg;
    const sid = await ensureSession();
    if (!sid) {
      pendingToSendRef.current = null;
      pendingAutoTitleRef.current = null;
      return false;
    }
    return true;
  }, [currentSessionId, sendMessage, ensureSession, messages, sessions, updateSessionTitle]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 min-h-0">
      <SessionsSidebar
        groupedSessions={groupedSessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onCreateSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={updateSessionTitle}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        loading={sessionsLoading}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth" role="log" aria-live="polite">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
            </div>
          ) : !hasMessages && !sending ? (
            <ChatEmptyState onSuggestionClick={(text) => setSuggestionText(text)} />
          ) : (
            <div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
              {messages.map((message) => {
                const isNew = !initialMsgIdsRef.current.has(message.id);
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    animate={isNew && message.role === 'assistant' && message.status === 'complete'}
                    onRetry={message.status === 'error' ? () => retryMessage(message.id) : undefined}
                  />
                );
              })}
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

  const canSend = !sending && input.trim().length > 0;

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
            <motion.button
              onClick={handleSubmit}
              disabled={!canSend}
              aria-label="Enviar mensagem"
              whileTap={canSend ? { scale: 0.92 } : {}}
              className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                canSend
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              }`}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1.5 px-1">
          <AnimatePresence mode="wait">
            {sending ? (
              <motion.p
                key="sending"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                Aguardando resposta do agente...
              </motion.p>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] text-muted-foreground/40"
              >
                Enter para enviar · Shift+Enter para nova linha
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
