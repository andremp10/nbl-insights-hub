import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { ArrowUp, Loader2, Bot, PanelLeft } from 'lucide-react';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { SessionsSidebar, type SessionsSidebarHandle, type SidebarMode } from '@/components/chat/SessionsSidebar';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatShortcuts } from '@/hooks/useChatShortcuts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SIDEBAR_MODE_KEY = 'nbl_sidebar_mode';

export default function Chat() {
  const { sessions, groupedSessions, pinnedIds, togglePinSession, createSession, deleteSession, updateSessionTitle, loading: sessionsLoading } = useChatSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    if (typeof window === 'undefined') return 'expanded';
    if (window.innerWidth < 768) return 'hidden';
    const saved = localStorage.getItem(SIDEBAR_MODE_KEY);
    return (saved === 'rail' || saved === 'expanded') ? saved as SidebarMode : 'expanded';
  });
  const sidebarRef = useRef<SessionsSidebarHandle>(null);
  const { messages, loading: messagesLoading, sending, sendMessage, retryMessage } = useChatMessages(currentSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingHandled = useRef(false);
  const pendingToSendRef = useRef<string | null>(null);
  const pendingAutoTitleRef = useRef<string | null>(null);

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

  // Auto-scroll: throttled via rAF, uses 'auto' during streaming to avoid reflow storms.
  const lastMsgContent = messages.length > 0 ? messages[messages.length - 1].content : '';
  const lastMsgStatus = messages.length > 0 ? messages[messages.length - 1].status : '';
  useEffect(() => {
    let raf = 0;
    raf = requestAnimationFrame(() => {
      const isStreaming = lastMsgStatus === 'streaming' || lastMsgStatus === 'pending' || sending;
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
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
    <div className="flex h-full min-h-0 overflow-hidden">
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

      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-12 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
                title="Abrir sessões"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
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

        {/* ── Messages area ── */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scroll-smooth" role="log" aria-live="polite">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
            </div>
          ) : !hasMessages && !sending ? (
            <ChatEmptyState onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRetry={message.status === 'error' ? () => handleRetry(message.id) : undefined}
                  onFollowUp={handleSuggestionClick}
                />
              ))}
              <div ref={messagesEndRef} className="h-px" />
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
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
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
    <div className="shrink-0 border-t border-border/50 bg-background px-3 py-3 sm:px-4 md:px-6">
      <div className="w-full max-w-3xl mx-auto">
        <div className={cn(
          'relative rounded-2xl border bg-card/60 transition-all duration-200',
          'shadow-sm',
          input.trim() ? 'border-primary/30 shadow-primary/5' : 'border-border/50',
        )}>
          <textarea
            ref={textareaRef}
            value={input}
            disabled={sending}
            onChange={(e) => { if (!sending) { setInput(e.target.value); adjustHeight(); } }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre financeiro, pedidos, clientes..."
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent border-0',
              'px-4 pt-3 pb-12 text-sm text-foreground',
              'placeholder:text-muted-foreground/40',
              'focus:outline-none focus:ring-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            style={{ minHeight: '52px', maxHeight: '200px' }}
            aria-label="Campo de mensagem"
          />
          {/* Bottom bar inside the composer */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2">
            <span className="text-[10px] text-muted-foreground/30 select-none">
              Shift+Enter para nova linha
            </span>
            <button
              onClick={handleSubmit}
              disabled={!canSend}
              aria-label="Enviar mensagem"
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 active:scale-95',
                canSend
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/25'
                  : 'bg-muted text-muted-foreground/30 cursor-not-allowed'
              )}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/30 text-center mt-2 select-none">
          O assistente pode cometer erros. Verifique dados importantes.
        </p>
      </div>
    </div>
  );
});
