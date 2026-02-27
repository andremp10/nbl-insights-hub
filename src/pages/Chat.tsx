import { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Sparkles, DollarSign, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ThinkingBubble } from '@/components/chat/ThinkingBubble';
import { useChatbot, SuggestedAction } from '@/hooks/useChatbot';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { cn } from '@/lib/utils';

export default function Chat() {
  const { messages, isLoading, sendMessage, clearMessages } = useChatbot();
  const { setDateRange } = useDateFilter();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Smooth auto-scroll with RAF
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Throttled mouse tracking
  useEffect(() => {
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleActionClick = (action: SuggestedAction) => {
    if (action.type === 'set_date_range' && action.from && action.to) {
      setDateRange({ from: new Date(action.from), to: new Date(action.to) });
    } else if (action.type === 'open_module' && action.module) {
      navigate(`/${action.module}`);
    }
  };

  const quickActions = [
    { icon: <DollarSign className="w-4 h-4" />, label: 'Financeiro', action: () => sendMessage('/financeiro resumo') },
    { icon: <Package className="w-4 h-4" />, label: 'Pedidos', action: () => sendMessage('/pedidos status') },
    { icon: <TrendingUp className="w-4 h-4" />, label: 'Receita', action: () => sendMessage('Qual foi a receita do período?') },
    { icon: <TrendingDown className="w-4 h-4" />, label: 'Despesas', action: () => sendMessage('Quais foram as principais despesas?') },
  ];

  const hasMessages = messages.length > 1;

  return (
    <DashboardLayout title="Assistente NBL" showDateFilter={false}>
      <div
        className="flex flex-col h-[calc(100vh-7rem)] -m-6 md:-m-8 relative overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Grid Background */}
        <div className="absolute inset-0 chat-grid-bg opacity-50 pointer-events-none" />

        {/* Glow Effect — GPU-accelerated */}
        {isHovering && (
          <motion.div
            className="fixed w-[40rem] h-[40rem] rounded-full pointer-events-none z-0 will-change-transform"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              x: mousePosition.x - 320,
              y: mousePosition.y - 320,
            }}
            transition={{
              type: 'tween',
              duration: 0.15,
              ease: 'linear',
            }}
          />
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-border/50 bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center transition-shadow duration-700",
                isLoading && "shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
              )}
            >
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">Assistente NBL</h2>
              <p className={cn(
                "text-[11px] transition-colors duration-300",
                isLoading ? "text-primary/80" : "text-muted-foreground"
              )}>
                {isLoading ? 'Pensando...' : 'Online'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        </div>

        {/* Messages area */}
        <div
          ref={scrollContainerRef}
          className="relative z-10 flex-1 overflow-y-auto scrollbar-thin scroll-smooth"
        >
          <AnimatePresence mode="wait">
            {!hasMessages ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center h-full px-4"
              >
                <div className="text-center max-w-md">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-6"
                    animate={{
                      boxShadow: [
                        '0 0 20px hsl(var(--primary) / 0.1)',
                        '0 0 40px hsl(var(--primary) / 0.2)',
                        '0 0 20px hsl(var(--primary) / 0.1)',
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Como posso ajudar?
                  </h2>
                  <p className="text-muted-foreground text-sm mb-8">
                    Pergunte sobre financeiro, pedidos, clientes e mais.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {quickActions.map((action, index) => (
                      <motion.button
                        key={action.label}
                        onClick={action.action}
                        disabled={isLoading}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm',
                          'bg-card/50 border border-border/50',
                          'text-muted-foreground hover:text-foreground',
                          'hover:bg-card hover:border-border',
                          'transition-all duration-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.08 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl mx-auto px-4 py-6 space-y-5"
              >
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onActionClick={handleActionClick}
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

        {/* Input area */}
        <div className="relative z-10">
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </DashboardLayout>
  );
}
