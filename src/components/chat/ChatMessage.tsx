import { memo, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChatMessages';
import { AlertTriangle, RotateCcw, Bot, Copy, Check } from 'lucide-react';
import { ThinkingBubble } from './ThinkingBubble';
import { useTypewriter } from '@/hooks/useTypewriter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function detectHighlightCard(content: string): { label: string; value: string } | null {
  const trimmed = content.trim();
  if (trimmed.includes('\n') || trimmed.includes('|') || trimmed.includes('- ') || trimmed.length > 120) return null;
  const colonMatch = trimmed.match(/^(.+?):\s*(R?\$?\s*[\d.,]+(?:\s*%)?)\s*$/);
  if (colonMatch) return { label: colonMatch[1].trim(), value: colonMatch[2].trim() };
  const currencyOnly = trimmed.match(/^R?\$\s*[\d.,]+$/);
  if (currencyOnly) return { label: 'Resultado', value: trimmed };
  return null;
}

function isNumericCell(text: string): boolean {
  if (!text) return false;
  const cleaned = text.replace(/[R$%.,\s]/g, '');
  return /^\d+$/.test(cleaned);
}

const QUICK_ACTIONS = [
  { label: 'Refinar período', query: 'Refine o período da última consulta' },
  { label: 'Top 10', query: 'Mostre o top 10 da última consulta' },
  { label: 'Agrupar por status', query: 'Agrupe por status os dados da última consulta' },
];

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
  onFollowUp?: (text: string) => void;
  animate?: boolean;
}

export const ChatMessage = memo(function ChatMessage({ message, onRetry, onFollowUp, animate = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isPending = message.status === 'pending';
  const isError = message.status === 'error';
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const shouldAnimate = animate && !isUser && !isPending && !isError;
  const { displayedText, isTyping } = useTypewriter(message.content, shouldAnimate, 8);
  const contentToRender = shouldAnimate ? displayedText : message.content;

  const highlightCard = useMemo(() => {
    if (isUser || isPending || isError) return null;
    return detectHighlightCard(message.content);
  }, [message.content, isUser, isPending, isError]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      toast.success('Copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message.content]);

  if (isPending && !isUser) return <ThinkingBubble />;

  const showQuickActions = !isUser && !isError && !isPending && message.content && !isTyping;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3 w-full', isUser ? 'justify-end pl-12' : 'justify-start pr-12')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isUser && (
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 transition-all duration-200',
          isError
            ? 'bg-destructive/10 border border-destructive/30'
            : 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20'
        )}>
          {isError ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Bot className="h-4 w-4 text-primary" />}
        </div>
      )}

      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start', isUser ? 'max-w-[75%]' : 'max-w-[85%]')}>
        <div className={cn(
          'px-4 py-3 space-y-3',
          isUser ? 'chat-bubble-user' : isError ? 'chat-bubble-error' : 'chat-bubble-assistant'
        )}>
          {isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive/90">
                {message.error_detail || message.content || 'Não foi possível processar sua consulta.'}
              </p>
              <p className="text-xs text-muted-foreground">Tente reduzir o período da consulta.</p>
              {onRetry && (
                <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors">
                  <RotateCcw className="w-3 h-3" />
                  Tentar novamente
                </button>
              )}
            </div>
          ) : highlightCard ? (
            <div className="text-center py-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{highlightCard.label}</p>
              <p className="text-2xl font-bold text-primary">{highlightCard.value}</p>
            </div>
          ) : (
            <div className={cn('text-sm leading-relaxed break-words', isUser ? 'text-primary-foreground' : '')}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children, ...props }) => (
                    <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm" {...props}>{children}</table>
                    </div>
                  ),
                  thead: ({ children, ...props }) => (
                    <thead className="bg-primary/10 border-b border-border" {...props}>{children}</thead>
                  ),
                  tbody: ({ children, ...props }) => (
                    <tbody className="[&_tr:nth-child(even)]:bg-muted/30 [&_tr:last-child]:border-0" {...props}>{children}</tbody>
                  ),
                  tr: ({ children, ...props }) => (
                    <tr className="border-b border-border/50" {...props}>{children}</tr>
                  ),
                  th: ({ children, ...props }) => (
                    <th className="h-9 px-3 text-left align-middle font-semibold text-muted-foreground text-xs" {...props}>{children}</th>
                  ),
                  td: ({ children, ...props }) => {
                    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
                    const numeric = isNumericCell(String(text));
                    return (
                      <td className={cn("px-3 py-2 align-middle text-sm", numeric && "text-right font-mono tabular-nums")} {...props}>{children}</td>
                    );
                  },
                  p: ({ children, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props}>{children}</p>,
                  ul: ({ children, ...props }) => <ul className="my-2 ml-4 list-disc [&>li]:mt-1 marker:text-primary" {...props}>{children}</ul>,
                  ol: ({ children, ...props }) => <ol className="my-2 ml-4 list-decimal [&>li]:mt-1 marker:text-primary" {...props}>{children}</ol>,
                  strong: ({ children, ...props }) => <strong className="font-semibold text-foreground" {...props}>{children}</strong>,
                  h1: ({ children, ...props }) => <h1 className="text-lg font-semibold text-foreground mb-2 mt-3 first:mt-0" {...props}>{children}</h1>,
                  h2: ({ children, ...props }) => <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0" {...props}>{children}</h2>,
                  h3: ({ children, ...props }) => <h3 className="text-sm font-semibold text-foreground mb-1.5 mt-2 first:mt-0" {...props}>{children}</h3>,
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline
                      ? <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono" {...props}>{children}</code>
                      : <code className={cn('block p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto', className)} {...props}>{children}</code>;
                  },
                }}
              >
                {contentToRender}
              </ReactMarkdown>
              {isTyping && <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />}
            </div>
          )}
        </div>

        {/* Footer: time + copy + quick actions */}
        <div className="flex items-center gap-2 mt-1 px-1 flex-wrap">
          <span className="text-[11px] text-muted-foreground/50">{formatTime(message.created_at)}</span>
          {!isUser && !isError && !isPending && message.content && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              aria-label="Copiar mensagem"
            >
              {copied ? <><Check className="w-3 h-3 text-success" /><span className="text-success">Copiado</span></> : <><Copy className="w-3 h-3" /><span>Copiar</span></>}
            </motion.button>
          )}
        </div>

        {/* Quick action chips for assistant messages */}
        {showQuickActions && onFollowUp && (
          <div className="flex flex-wrap gap-1.5 mt-2 px-1">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => onFollowUp(a.query)}
                className="text-[11px] px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});
