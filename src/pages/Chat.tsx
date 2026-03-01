import { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, Database } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ThinkingBubble } from '@/components/chat/ThinkingBubble';
import { AppHeader } from '@/components/layout/AppHeader';
import { useChatbot } from '@/hooks/useChatbot';
import { cn } from '@/lib/utils';

const EMPTY_SUGGESTIONS = [
  'Qual o faturamento do mês atual?',
  'Quais os 10 clientes com mais pedidos?',
  'Qual o ticket médio dos pedidos?',
];

export default function Chat() {
  const { messages, isLoading, sendMessage, cancelRequest, clearMessages } = useChatbot();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const pendingHandled = useRef(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  /* pending query from Home */
  useEffect(() => {
    if (pendingHandled.current) return;
    const pending = localStorage.getItem('nbl_pending_query');
    if (pending) {
      pendingHandled.current = true;
      localStorage.removeItem('nbl_pending_query');
      sendMessage(pending);
    }
  }, [sendMessage]);

  const handleSend = useCallback((msg: string) => {
    sendMessage(msg);
  }, [sendMessage]);

  const hasMessages = messages.length > 1;

  return (
    <div className="dark flex flex-col h-screen bg-background">
      <AppHeader />

      {/* Main chat area below header */}
      <div className="flex flex-col flex-1 pt-14 min-h-0">
        {/* Top bar with status + clear */}
        <div className="flex-shrink-0 flex items-center justify-between h-10 px-4 md:px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', isLoading ? 'bg-warning animate-pulse' : 'bg-success')} />
            <span className="text-[11px] text-muted-foreground">{isLoading ? 'Processando...' : 'Online'}</span>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            aria-label="Limpar conversa"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth" role="log" aria-live="polite">
          <AnimatePresence mode="wait">
            {!hasMessages ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full px-4">
                <div className="text-center max-w-md">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-card border border-border mb-5">
                    <Database className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Como posso ajudar com os dados da NBL?</h2>
                  <p className="text-sm text-muted-foreground mb-6">Consulte pedidos, clientes, financeiro e muito mais.</p>
                  <div className="flex flex-col gap-2">
                    {EMPTY_SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => handleSend(s)} disabled={isLoading} className={cn('text-left px-4 py-3 rounded-xl text-sm border border-border', 'text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5', 'transition-all duration-150 disabled:opacity-50')}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onRetry={message.isError ? () => {
                      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUserMsg) sendMessage(lastUserMsg.content);
                    } : undefined}
                  />
                ))}
                <AnimatePresence>{isLoading && <ThinkingBubble />}</AnimatePresence>
                <div ref={messagesEndRef} className="h-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} onCancel={cancelRequest} isLoading={isLoading} />
      </div>

      {/* Clear confirmation modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-base font-semibold text-foreground mb-2">Limpar conversa?</h3>
              <p className="text-sm text-muted-foreground mb-5">Todo o histórico será apagado permanentemente.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                <button onClick={() => { clearMessages(); setShowClearConfirm(false); }} className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Limpar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
