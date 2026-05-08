import { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChatMessages';
import { AlertTriangle, RotateCcw, Copy, Check, Calendar, Info, Clock } from 'lucide-react';
import { AgentSteps } from './AgentSteps';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

const THINKING_PHRASES = [
  'Conectando ao agente…',
  'Interpretando sua pergunta…',
  'Buscando dados nas views…',
  'Calculando indicadores…',
  'Compondo a resposta…',
];

const AgentThinking = memo(function AgentThinking({ softTimeout }: { softTimeout?: boolean }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhraseIdx((i) => (i + 1) % THINKING_PHRASES.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="agent-thinking-card" aria-live="polite">
      <div className="relative flex items-center gap-3">
        <span className="agent-dots" aria-hidden>
          <span /><span /><span />
        </span>
        <span
          key={phraseIdx}
          className="agent-step-active-text text-xs font-medium animate-in fade-in duration-300"
        >
          {THINKING_PHRASES[phraseIdx]}
        </span>
      </div>
      {softTimeout && (
        <p className="relative mt-2 inline-flex items-center gap-1.5 text-[11px] text-warning">
          <Clock className="w-3 h-3" />
          Esta consulta está demorando mais que o normal — aguarde mais alguns instantes.
        </p>
      )}
    </div>
  );
});


function formatTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function normalizeMarkdown(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableLine = /^\s*\|/.test(line);
    const prevIsTable = i > 0 && /^\s*\|/.test(lines[i - 1]);
    if (isTableLine && !prevIsTable && i > 0 && result.length > 0 && result[result.length - 1].trim() !== '') {
      result.push('');
    }
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

/* ── Markdown components ── */
const markdownComponents = {
  table: ({ children, ...props }: any) => (
    <div className="chat-table-wrapper my-3 w-full overflow-x-auto rounded-lg border border-border/60 scrollbar-thin">
      <table className="w-full text-sm border-collapse" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-primary/8 border-b border-border/60 sticky top-0" {...props}>{children}</thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody className="[&_tr:nth-child(even)]:bg-muted/15 [&_tr:last-child]:border-0" {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors" {...props}>{children}</tr>
  ),
  th: ({ children, ...props }: any) => (
    <th className="h-9 px-3 text-left align-middle font-semibold text-muted-foreground text-[11px] uppercase tracking-wider whitespace-nowrap" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: any) => {
    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
    const textStr = String(text);
    const numeric = isNumericCell(textStr);
    return (
      <td
        className={cn(
          "px-3 py-2 align-middle text-sm",
          numeric
            ? "text-right font-mono tabular-nums whitespace-nowrap"
            : "max-w-[460px] whitespace-normal break-words"
        )}
        title={!numeric && textStr ? textStr : undefined}
        {...props}
      >
        {children}
      </td>
    );
  },
  p: ({ children, ...props }: any) => <p className="mb-2.5 last:mb-0 leading-relaxed" {...props}>{children}</p>,
  ul: ({ children, ...props }: any) => <ul className="my-2 ml-4 list-disc [&>li]:mt-1 marker:text-primary/60" {...props}>{children}</ul>,
  ol: ({ children, ...props }: any) => <ol className="my-2 ml-4 list-decimal [&>li]:mt-1 marker:text-primary/60" {...props}>{children}</ol>,
  strong: ({ children, ...props }: any) => <strong className="font-semibold text-foreground" {...props}>{children}</strong>,
  em: ({ children, ...props }: any) => {
    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? c : '').join('') : '';
    const isMetadata = /Períodos?:|Escopo:|Período:/i.test(text);
    const isWarning = /Limitação:|Nota:|Aviso:/i.test(text);
    if (isMetadata) {
      const parts = text.split('·').map((s: string) => s.trim()).filter(Boolean);
      return (
        <span className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-border/20">
          {parts.map((part: string, i: number) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/30 text-[11px] text-muted-foreground">
              {i === 0 ? <Calendar className="w-3 h-3 shrink-0 text-primary/60" /> : <Info className="w-3 h-3 shrink-0 text-primary/60" />}
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
  h1: ({ children, ...props }: any) => <h1 className="text-lg font-semibold text-foreground mb-2 mt-4 first:mt-0" {...props}>{children}</h1>,
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

/**
 * Memoized markdown body — only re-renders when content actually changes.
 * Prevents reparsing markdown for every token during streaming.
 */
const MarkdownBody = memo(function MarkdownBody({ content }: { content: string }) {
  const normalized = useMemo(() => normalizeMarkdown(content), [content]);
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
      {normalized}
    </ReactMarkdown>
  );
});

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
  onFollowUp?: (text: string) => void;
}

export const ChatMessage = memo(function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isPending = message.status === 'pending';
  const isStreaming = message.status === 'streaming';
  const isProcessing = message.status === 'processing';
  const isError = message.status === 'error';
  const isComplete = message.status === 'complete';
  const isInFlight = isPending || isStreaming || isProcessing;
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const hasSteps = !!(message.steps && message.steps.length > 0);
  const hasContent = !!message.content;
  // Keep steps visible (collapsed) once content starts so the user sees what happened
  const showSteps = !isUser && hasSteps && !isError;
  const showThinking = !isUser && isInFlight && !hasSteps && !hasContent;
  const showSkeleton = !isUser && isInFlight && hasSteps && !hasContent;
  const startedAt = message.startedAt;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      toast.success('Copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message.content]);

  if (isUser) {
    return (
      <div className="chat-msg-fade-in flex justify-end">
        <div className="chat-msg-user max-w-[80%] md:max-w-[70%]">
          <p className="text-sm leading-relaxed">{message.content}</p>
          <span className="block text-[10px] text-primary-foreground/40 mt-1.5 text-right select-none">{formatTime(message.created_at)}</span>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (isError) {
      return (
        <div className="space-y-2.5 py-1">
          <p className="text-sm text-destructive/90">
            {message.error_detail || message.content || 'Não foi possível processar sua consulta.'}
          </p>
          <p className="text-xs text-muted-foreground/60">Tente reduzir o período ou reformular a pergunta.</p>
          {onRetry && (
            <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors mt-1">
              <RotateCcw className="w-3 h-3" />
              Tentar novamente
            </button>
          )}
        </div>
      );
    }

    if (showThinking) {
      return (
        <div className="py-1">
          <AgentThinking softTimeout={message.softTimeout} />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {showSteps && (
          <div className="py-1">
            <AgentSteps steps={message.steps!} isComplete={hasContent} startedAt={startedAt} />
          </div>
        )}

        {hasContent && (
          <div className="text-sm leading-relaxed break-words prose-chat">
            <MarkdownBody content={message.content} />
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="chat-msg-fade-in group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn(
          'w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center',
          isInFlight && 'agent-halo'
        )}>
          <span className="text-[10px] font-bold text-primary">N</span>
        </div>
        <span className="text-xs font-medium text-foreground/60">Assistente NBL</span>
        <span className="text-[10px] text-muted-foreground/30 select-none">{formatTime(message.created_at)}</span>
      </div>

      {/* Body */}
      <div className={cn('pl-7', isError && 'border-l-2 border-destructive/40 pl-5 ml-2')}>
        {renderContent()}
      </div>

      {/* Actions */}
      {isComplete && message.content && (
        <div className={cn('pl-7 flex items-center gap-2 mt-1.5 transition-opacity duration-200', hovered ? 'opacity-100' : 'opacity-0')}>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Copiar mensagem"
          >
            {copied ? <><Check className="w-3 h-3 text-success" /><span className="text-success">Copiado</span></> : <><Copy className="w-3 h-3" /><span>Copiar</span></>}
          </button>
        </div>
      )}
    </div>
  );
});
