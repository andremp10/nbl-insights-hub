import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Trash2, Database, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ThinkingBubble } from '@/components/chat/ThinkingBubble';
import { ChatSuggestionsPanel } from '@/components/chat/ChatSuggestionsPanel';
import { useChatbot } from '@/hooks/useChatbot';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const EMPTY_SUGGESTIONS = [
  'Qual o faturamento do mês atual?',
  'Quais os 10 clientes com mais pedidos?',
  'Qual o ticket médio dos pedidos?',
];

export default function Chat() {
  const { messages, isLoading, sendMessage, cancelRequest, clearMessages } = useChatbot();
  const { logout } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingSuggestion, setPendingSuggestion] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setPendingSuggestion(suggestion);
  }, []);

  // When pendingSuggestion changes, send it
  const handleSend = useCallback((msg: string) => {
    sendMessage(msg);
    setPendingSuggestion('');
  }, [sendMessage]);

  const hasMessages = messages.length > 1;

  return (
    <div className="dark flex flex-col h-screen bg-background">
      {/* Header - 56px */}
      <header className="flex-shrink-0 flex items-center justify-between h-14 px-4 md:px-6 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="font-bold text-foreground text-base tracking-tight">
            NBL Gráfica
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Agente de Consulta
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isLoading
                ? 'bg-warning animate-pulse'
                : 'bg-success'
            )} />
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              {isLoading ? 'Processando...' : 'Online'}
            </span>
          </div>

          {/* Clear history */}
          <button
            onClick={() => setShowClearConfirm(true)}
            aria-label="Limpar conversa"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            aria-label="Sair"
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ChatSuggestionsPanel
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
          onSelect={handleSuggestionSelect}
        />

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth"
            role="log"
            aria-live="polite"
          >
            <AnimatePresence mode="wait">
              {!hasMessages ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full px-4"
                >
                  <div className="text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-card border border-border mb-5">
                      <Database className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Como posso ajudar com os dados da NBL?
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Consulte pedidos, clientes, financeiro e muito mais.
                    </p>
                    <div className="flex flex-col gap-2">
                      {EMPTY_SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s)}
                          disabled={isLoading}
                          className={cn(
                            'text-left px-4 py-3 rounded-xl text-sm border border-border',
                            'text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5',
                            'transition-all duration-150 disabled:opacity-50'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4"
                >
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onRetry={message.isError ? () => {
                        // Retry last user message
                        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                        if (lastUserMsg) sendMessage(lastUserMsg.content);
                      } : undefined}
                    />
                  ))}
                  <AnimatePresence>
                    {isLoading && <ThinkingBubble />}
                  </AnimatePresence>
                  <div ref={messagesEndRef} className="h-1" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            onCancel={cancelRequest}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Clear confirmation modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-xl"
            >
              <h3 className="text-base font-semibold text-foreground mb-2">Limpar conversa?</h3>
              <p className="text-sm text-muted-foreground mb-5">Todo o histórico será apagado permanentemente.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { clearMessages(); setShowClearConfirm(false); }}
                  className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
