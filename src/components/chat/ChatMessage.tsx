import { memo, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChatMessages';
import { AlertTriangle, RotateCcw, Bot, Copy, Check, Calendar, Info } from 'lucide-react';
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

/**
 * Normalizes markdown content to ensure tables parse correctly.
 * - Ensures blank lines before/after table blocks
 * - Trims excessive whitespace in cells
 */
function normalizeMarkdown(content: string): string {
  // Split into lines
  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableLine = /^\s*\|/.test(line);
    const prevIsTable = i > 0 && /^\s*\|/.test(lines[i - 1]);

    // Add blank line before table block starts
    if (isTableLine && !prevIsTable && i > 0 && result.length > 0 && result[result.length - 1].trim() !== '') {
      result.push('');
    }

    // Add blank line after table block ends
    if (!isTableLine && prevIsTable && line.trim() !== '') {
      result.push('');
    }

    result.push(line);
  }

  return result.join('\n');
}

function isNumericCell(text: string): boolean {
  if (!text) return false;
  const cleaned = text.replace(/[R$%.,\s]/g, '');
  return /^\d+$/.test(cleaned);
}

/* ── Markdown components (stable ref — no re-creation) ── */
const markdownComponents = {
  table: ({ children, ...props }: any) => (
    <div className="chat-table-wrapper my-3 w-full overflow-x-auto rounded-lg border border-border scrollbar-thin">
      <table className="w-full text-sm border-collapse" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-primary/10 border-b border-border sticky top-0" {...props}>{children}</thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody className="[&_tr:nth-child(even)]:bg-muted/20 [&_tr:last-child]:border-0" {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr className="border-b border-border/40 hover:bg-muted/30 transition-colors" {...props}>{children}</tr>
  ),
  th: ({ children, ...props }: any) => (
    <th className="h-9 px-3 text-left align-middle font-semibold text-muted-foreground text-[11px] uppercase tracking-wider whitespace-nowrap" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: any) => {
    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
    const textStr = String(text);
    const numeric = isNumericCell(textStr);
    const truncated = !numeric && textStr.length > 80 ? textStr.slice(0, 77) + '…' : null;
    return (
      <td
        className={cn(
          "px-3 py-2 align-middle text-sm max-w-[280px]",
          numeric && "text-right font-mono tabular-nums whitespace-nowrap",
          !numeric && "truncate"
        )}
        title={truncated ? textStr : undefined}
        {...props}
      >
        {truncated || children}
      </td>
    );
  },
  p: ({ children, ...props }: any) => <p className="mb-2 last:mb-0 leading-relaxed" {...props}>{children}</p>,
  ul: ({ children, ...props }: any) => <ul className="my-2 ml-4 list-disc [&>li]:mt-1 marker:text-primary" {...props}>{children}</ul>,
  ol: ({ children, ...props }: any) => <ol className="my-2 ml-4 list-decimal [&>li]:mt-1 marker:text-primary" {...props}>{children}</ol>,
  strong: ({ children, ...props }: any) => <strong className="font-semibold text-foreground" {...props}>{children}</strong>,
  em: ({ children, ...props }: any) => {
    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? c : '').join('') : '';
    const isMetadata = /Períodos?:|Escopo:|Período:/i.test(text);
    const isWarning = /Limitação:|Nota:|Aviso:/i.test(text);
    if (isMetadata) {
      const parts = text.split('·').map((s: string) => s.trim()).filter(Boolean);
      return (
        <span className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-border/30">
          {parts.map((part: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/50 text-[11px] text-muted-foreground">
              {i === 0 ? <Calendar className="w-3 h-3 shrink-0" /> : <Info className="w-3 h-3 shrink-0" />}
              {part}
            </span>
          ))}
        </span>
      );
    }
    if (isWarning) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 my-1 rounded-md bg-warning/10 border border-warning/20 text-[11px] text-warning">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {children}
        </span>
      );
    }
    return <em {...props}>{children}</em>;
  },
  h1: ({ children, ...props }: any) => <h1 className="text-lg font-semibold text-foreground mb-2 mt-3 first:mt-0" {...props}>{children}</h1>,
  h2: ({ children, ...props }: any) => <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0" {...props}>{children}</h2>,
  h3: ({ children, ...props }: any) => <h3 className="text-sm font-semibold text-foreground mb-1.5 mt-2 first:mt-0" {...props}>{children}</h3>,
  code: ({ className, children, ...props }: any) => {
    const isInline = !className;
    return isInline
      ? <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono" {...props}>{children}</code>
      : <code className={cn('block p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto', className)} {...props}>{children}</code>;
  },
};

const remarkPlugins = [remarkGfm];

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
  const { displayedText, isTyping } = useTypewriter(message.content, shouldAnimate, 6);

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

  // Use plain div for historical messages (no animation overhead)
  const Wrapper = animate ? motion.div : 'div';
  const wrapperProps = animate
    ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }
    : {};

  // During typewriter, render plain text to avoid reparsing markdown ~125x/s
  const renderContent = () => {
    if (isError) {
      return (
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
      );
    }

    if (highlightCard) {
      return (
        <div className="text-center py-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{highlightCard.label}</p>
          <p className="text-2xl font-bold text-primary">{highlightCard.value}</p>
        </div>
      );
    }

    return (
      <div className={cn('text-sm leading-relaxed break-words', isUser ? 'text-primary-foreground' : '')}>
        {isTyping ? (
          // Plain text during animation — no markdown parsing overhead
          <>
            <span className="whitespace-pre-wrap">{displayedText}</span>
            <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
          </>
        ) : (
          <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
            {normalizeMarkdown(message.content)}
          </ReactMarkdown>
        )}
      </div>
    );
  };

  return (
    <Wrapper
      {...wrapperProps}
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
          {renderContent()}
        </div>

        {/* Footer: time + copy */}
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
      </div>
    </Wrapper>
  );
});
