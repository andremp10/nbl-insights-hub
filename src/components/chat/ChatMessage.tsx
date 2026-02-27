import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Message, ChatHighlight, SuggestedAction } from '@/hooks/useChatbot';
import { ExternalLink, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function HighlightCard({ highlight }: { highlight: ChatHighlight }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="inline-flex flex-col gap-0.5 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20"
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {highlight.label}
      </span>
      <span className="text-base font-semibold text-primary">
        {formatCurrency(highlight.value)}
      </span>
    </motion.div>
  );
}

function ActionButton({
  action,
  onClick,
}: {
  action: SuggestedAction;
  onClick: () => void;
}) {
  const labels: Record<string, string> = {
    set_date_range: 'Ver período',
    open_module:
      action.module === 'financeiro'
        ? 'Ir para Financeiro'
        : action.module === 'pedidos'
          ? 'Ir para Pedidos'
          : 'Abrir módulo',
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 text-xs h-8 px-3 bg-secondary/50 hover:bg-secondary text-foreground/80 hover:text-foreground rounded-lg transition-all"
      onClick={onClick}
    >
      <ExternalLink className="h-3 w-3" />
      {labels[action.type] || 'Ação'}
    </Button>
  );
}

interface ChatMessageProps {
  message: Message;
  onActionClick: (action: SuggestedAction) => void;
}

const messageVariants = {
  hidden: (isUser: boolean) => ({
    opacity: 0,
    y: 12,
    x: isUser ? 8 : -8,
    scale: 0.97,
  }),
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      staggerChildren: 0.08,
    },
  },
};

const contentVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' as const },
  },
};

export function ChatMessage({ message, onActionClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      layout="position"
      layoutId={message.id}
      custom={isUser}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.05, type: 'spring', stiffness: 300, damping: 20 }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </motion.div>
      )}

      {/* Message bubble */}
      <motion.div
        variants={contentVariants}
        className={cn(
          'max-w-[80%] md:max-w-[70%] px-4 py-3 space-y-3',
          isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'
        )}
      >
        <div
          className={cn(
            'text-sm leading-relaxed max-w-none break-words',
            isUser ? 'text-primary-foreground' : ''
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ node, ...props }) => (
                <div className="my-4 w-full overflow-hidden rounded-lg border border-border/50">
                  <table className="w-full text-sm" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => (
                <thead className="bg-muted/50 border-b border-border/50" {...props} />
              ),
              tbody: ({ node, ...props }) => (
                <tbody className="[&_tr:last-child]:border-0" {...props} />
              ),
              tr: ({ node, ...props }) => (
                <tr
                  className="border-b border-border/50 transition-colors hover:bg-muted/50"
                  {...props}
                />
              ),
              th: ({ node, ...props }) => (
                <th
                  className="h-10 px-4 text-left align-middle font-medium text-muted-foreground"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td className="p-4 align-middle" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-3 last:mb-0 leading-relaxed" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="my-3 ml-5 list-disc [&>li]:mt-1.5" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="my-3 ml-5 list-decimal [&>li]:mt-1.5" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="text-foreground/90" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-foreground" {...props} />
              ),
              code: ({ node, className, children, ...props }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="px-1.5 py-0.5 rounded bg-muted/70 text-xs font-mono text-foreground/90" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={cn("block p-3 rounded-lg bg-muted/50 text-xs font-mono overflow-x-auto", className)} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Highlights */}
        {message.highlights && message.highlights.length > 0 && (
          <motion.div
            variants={contentVariants}
            className="flex flex-wrap gap-2 pt-2"
          >
            {message.highlights.map((h, i) => (
              <HighlightCard key={i} highlight={h} />
            ))}
          </motion.div>
        )}

        {/* Suggested actions */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <motion.div
            variants={contentVariants}
            className="flex flex-wrap gap-2 pt-2 border-t border-border/30"
          >
            {message.suggestedActions.map((action, i) => (
              <ActionButton
                key={i}
                action={action}
                onClick={() => onActionClick(action)}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Avatar for user */}
      {isUser && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.05, type: 'spring', stiffness: 300, damping: 20 }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <User className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
}
