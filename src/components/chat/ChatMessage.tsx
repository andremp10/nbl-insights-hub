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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
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
  onClick
}: {
  action: SuggestedAction;
  onClick: () => void;
}) {
  const labels: Record<string, string> = {
    'set_date_range': 'Ver período',
    'open_module': action.module === 'financeiro'
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

export function ChatMessage({ message, onActionClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[80%] md:max-w-[70%] px-4 py-3 space-y-3',
          isUser
            ? 'chat-bubble-user'
            : 'chat-bubble-assistant'
        )}
      >
        <div className={cn("text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words", isUser ? "prose-p:text-primary-foreground prose-a:text-primary-foreground/90" : "")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Highlights */}
        {message.highlights && message.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {message.highlights.map((h, i) => (
              <HighlightCard key={i} highlight={h} />
            ))}
          </div>
        )}

        {/* Suggested actions */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
            {message.suggestedActions.map((action, i) => (
              <ActionButton
                key={i}
                action={action}
                onClick={() => onActionClick(action)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}