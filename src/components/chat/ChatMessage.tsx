import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChatMessages';
import { Database, AlertTriangle, RotateCcw } from 'lucide-react';
import { ThinkingBubble } from './ThinkingBubble';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
}

export const ChatMessage = memo(function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isPending = message.status === 'pending';
  const isError = message.status === 'error';

  // Pending assistant message → show thinking bubble
  if (isPending && !isUser) {
    return <ThinkingBubble />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Avatar - assistant only */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center mt-1">
          {isError ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Database className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}

      <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start', isUser ? 'max-w-[70%]' : 'max-w-[85%]')}>
        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-3 space-y-3',
            isUser
              ? 'chat-bubble-user'
              : isError
                ? 'chat-bubble-error'
                : 'chat-bubble-assistant'
          )}
        >
          {isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive/90">
                {message.error_detail || message.content || 'Não foi possível processar sua consulta.'}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Tentar novamente
                </button>
              )}
            </div>
          ) : (
            <div className={cn('text-sm leading-relaxed break-words', isUser ? 'text-primary-foreground' : '')}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children, ...props }) => (
                    <div className="my-3 w-full overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-sm" {...props}>{children}</table>
                    </div>
                  ),
                  thead: ({ children, ...props }) => (
                    <thead className="bg-primary/10 border-b border-border" {...props}>{children}</thead>
                  ),
                  tbody: ({ children, ...props }) => (
                    <tbody className="[&_tr:nth-child(even)]:bg-card [&_tr:last-child]:border-0" {...props}>{children}</tbody>
                  ),
                  tr: ({ children, ...props }) => (
                    <tr className="border-b border-border/50" {...props}>{children}</tr>
                  ),
                  th: ({ children, ...props }) => (
                    <th className="h-9 px-3 text-left align-middle font-semibold text-muted-foreground text-xs" {...props}>{children}</th>
                  ),
                  td: ({ children, ...props }) => (
                    <td className="px-3 py-2 align-middle text-sm" {...props}>{children}</td>
                  ),
                  p: ({ children, ...props }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed" {...props}>{children}</p>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="my-2 ml-4 list-disc [&>li]:mt-1 marker:text-primary" {...props}>{children}</ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol className="my-2 ml-4 list-decimal [&>li]:mt-1 marker:text-primary" {...props}>{children}</ol>
                  ),
                  strong: ({ children, ...props }) => (
                    <strong className="font-semibold text-foreground" {...props}>{children}</strong>
                  ),
                  h1: ({ children, ...props }) => (
                    <h1 className="text-lg font-semibold text-foreground mb-2 mt-3 first:mt-0" {...props}>{children}</h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0" {...props}>{children}</h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 className="text-sm font-semibold text-foreground mb-1.5 mt-2 first:mt-0" {...props}>{children}</h3>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono" {...props}>{children}</code>
                    ) : (
                      <code className={cn('block p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto', className)} {...props}>{children}</code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[11px] text-muted-foreground/50 mt-1 px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </motion.div>
  );
});
