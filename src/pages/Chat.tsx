import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { ArrowUp, Loader2, Bot, Plus } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { SessionsSidebar } from '@/components/chat/SessionsSidebar';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useChatMessages } from '@/hooks/useChatMessages';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Chat() {
  const { sessions, groupedSessions, createSession, deleteSession, updateSessionTitle, loading: sessionsLoading } = useChatSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { messages, loading: messagesLoading, sending, sendMessage, retryMessage } = useChatMessages(currentSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingHandled = useRef(false);
  const pendingToSendRef = useRef<string | null>(null);
  const pendingAutoTitleRef = useRef<string | null>(null);

  // Stable callback refs to avoid invalidating ChatMessage memo
  const retryRef = useRef(retryMessage);
  retryRef.current = retryMessage;

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (currentSessionId) return currentSessionId;
    const s = await createSession();
    if (s) { setCurrentSessionId(s.id); return s.id; }
    return null;
  }, [currentSessionId, createSession]);


  useEffect(() => {
    if (!currentSessionId || !pendingToSendRef.current) return;
    const msg = pendingToSendRef.current;
    pendingToSendRef.current = null;
    sendMessage(msg);
  }, [currentSessionId, sendMessage]);

  useEffect(() => {
    if (!currentSessionId || !pendingAutoTitleRef.current) return;
    const title = pendingAutoTitleRef.current;
    pendingAutoTitleRef.current = null;
    updateSessionTitle(currentSessionId, title);
  }, [currentSessionId, updateSessionTitle]);

  // Auto-scroll on new messages or during streaming
  const lastMsgContent = messages.length > 0 ? messages[messages.length - 1].content : '';
  const lastMsgStatus = messages.length > 0 ? messages[messages.length - 1].status : '';
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, lastMsgContent, lastMsgStatus, sending]);

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

  const handleSuggestionClick = useCallback((text: string) => {
    handleSend(text);
  }, [handleSend]);

  // Stable retry handler using ref
  const handleRetry = useCallback((msgId: string) => {
    retryRef.current(msgId);
  }, []);

  const hasMessages = messages.length > 0;

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const chatStatus: 'idle' | 'sending' | 'error' = sending
    ? 'sending'
    : lastMsg?.status === 'error'
      ? 'error'
      : 'idle';


  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
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
        {/* ── Header fixo ── */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Assistente NBL</span>
            <StatusBadge status={chatStatus} />
          </div>
          <div className="flex items-center gap-1">
            <HeaderButton icon={Plus} label="Nova conversa" onClick={handleNewSession} />
          </div>
        </div>

        {/* ── Corpo central ── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth" role="log" aria-live="polite">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
            </div>
          ) : !hasMessages && !sending ? (
            <ChatEmptyState onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="w-full max-w-[860px] mx-auto px-4 md:px-8 py-6 space-y-5">
              {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onRetry={message.status === 'error' ? () => handleRetry(message.id) : undefined}
                    onFollowUp={handleSuggestionClick}
                  />
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          )}
        </div>

        {/* ── Composer ── */}
        <ChatComposer onSend={handleSend} sending={sending} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: 'idle' | 'sending' | 'error' }) {
  if (status === 'sending') {
    return (
      <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-warning/40 text-warning gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
        Consultando…
      </Badge>
    );
  }
  if (status === 'error') {
    return (
      <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-destructive/40 text-destructive gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
        Erro
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-success/40 text-success gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      Conectado
    </Badge>
  );
}

function HeaderButton({ icon: Icon, label, onClick, disabled }: { icon: React.ElementType; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

const ChatComposer = memo(function ChatComposer({ onSend, sending }: { onSend: (msg: string) => Promise<boolean>; sending: boolean }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef(false);

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
    <div className="border-t border-border bg-background px-4 py-3 md:px-6">
      <div className="w-full max-w-[860px] mx-auto">
        <div className="relative bg-muted/40 rounded-2xl p-2">
          <textarea
            ref={textareaRef}
            value={input}
            disabled={sending}
            onChange={(e) => { if (!sending) { setInput(e.target.value); adjustHeight(); } }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre financeiro, pedidos, clientes..."
            rows={1}
            className="w-full resize-none bg-transparent border-0 px-4 py-2.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: '40px', maxHeight: '120px' }}
            aria-label="Campo de mensagem"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label="Enviar mensagem"
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 active:scale-95',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : 'bg-muted-foreground/20 text-muted-foreground cursor-not-allowed'
            )}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
});
