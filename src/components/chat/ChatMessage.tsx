import { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/hooks/useChatMessages';
import { AlertTriangle, RotateCcw, Copy, Check, Calendar, Info, Clock, Check as CheckIcon, FileDown, Sparkles } from 'lucide-react';
import { AgentSteps } from './AgentSteps';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

// Timeline of simulated reasoning steps. Each step has a min start time (s).
// The "active" step is the last one whose start <= elapsed. Steps with start
// in the future appear muted; past steps appear as completed.
const THINKING_STEPS: Array<{ start: number; label: string }> = [
  { start: 0,   label: 'Conectando ao agente' },
  { start: 3,   label: 'Interpretando sua pergunta' },
  { start: 10,  label: 'Identificando views e período' },
  { start: 25,  label: 'Consultando base de dados' },
  { start: 60,  label: 'Agregando indicadores' },
  { start: 120, label: 'Cruzando dados e gerando insights' },
  { start: 240, label: 'Finalizando análise' },
];

function formatElapsed(s: number): string {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

const AgentThinking = memo(function AgentThinking({
  startedAt,
}: {
  startedAt?: number;
  softTimeout?: boolean;
}) {
  const [elapsed, setElapsed] = useState(() =>
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0,
  );
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Determine current active step
  let activeIdx = 0;
  for (let i = 0; i < THINKING_STEPS.length; i++) {
    if (elapsed >= THINKING_STEPS[i].start) activeIdx = i;
  }

  return (
    <div className="agent-thinking-card" aria-live="polite">
      <div className="relative flex items-center gap-3 mb-2">
        <span className="agent-dots" aria-hidden>
          <span /><span /><span />
        </span>
        <span className="agent-step-active-text text-xs font-medium">
          {THINKING_STEPS[activeIdx].label}…
        </span>
        <span className="ml-auto text-[11px] font-mono tabular-nums text-muted-foreground/70">
          {formatElapsed(elapsed)}
        </span>
      </div>

      <ol className="relative space-y-1.5 pl-1">
        {THINKING_STEPS.map((step, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          const isFuture = i > activeIdx;
          return (
            <li
              key={step.start}
              className={cn(
                'flex items-center gap-2 text-[11px] transition-colors duration-300',
                isFuture && 'text-muted-foreground/30',
                isDone && 'text-muted-foreground/60',
                isActive && 'text-foreground/90 font-medium',
              )}
            >
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-all duration-300',
                  isDone && 'bg-success/15 border-success/40 text-success',
                  isActive && 'bg-primary/20 border-primary/60 text-primary animate-pulse',
                  isFuture && 'bg-transparent border-border/40 text-transparent',
                )}
                aria-hidden
              >
                {isDone ? (
                  <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
                ) : isActive ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                ) : null}
              </span>
              <span className="truncate">{step.label}</span>
            </li>
          );
        })}
      </ol>

      {elapsed >= 240 && (
        <p className="relative mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <Clock className="w-3 h-3" />
          Consultas longas podem levar até ~5 min. Você pode continuar usando o app — a resposta aparecerá aqui automaticamente.
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

/* Detect a strong containing a numeric/value highlight (e.g. "339 pedidos", "R$ 1.200,00", "12%") */
function isNumericHighlight(text: string): boolean {
  if (!text) return false;
  return /\d/.test(text) && /^(R\$\s?)?[\d.,]+(\s?(pedidos?|unidades?|clientes?|itens?|reais?|%|mil|k|M))?\s*$/i.test(text.trim())
    || /^R\$\s?[\d.,]+/i.test(text.trim())
    || /\d[\d.,]*\s*(pedidos?|unidades?|clientes?|itens?|%)/i.test(text.trim());
}

/* Render a section heading as a B2B section label (vertical primary bar + uppercase tracking) */
function SectionLabel({ children }: { children: any }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3 first:mt-0">
      <div className="h-4 w-[2px] bg-primary shrink-0" />
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

/* ── Markdown components ── */
const markdownComponents = {
  table: ({ children, ...props }: any) => (
    <div className="chat-table-wrapper my-3 w-full overflow-x-auto rounded-sm border border-border scrollbar-thin">
      <table className="w-full text-sm border-collapse" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-muted/40 border-b border-border sticky top-0" {...props}>{children}</thead>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody className="divide-y divide-border/50" {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr className="hover:bg-muted/20 transition-colors" {...props}>{children}</tr>
  ),
  th: ({ children, ...props }: any) => (
    <th className="h-8 px-3 text-left align-middle font-semibold text-muted-foreground text-[11px] uppercase tracking-wider whitespace-nowrap" {...props}>{children}</th>
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
            ? "text-right font-mono tabular-nums whitespace-nowrap text-foreground"
            : "max-w-[460px] whitespace-normal break-words text-foreground/90"
        )}
        title={!numeric && textStr ? textStr : undefined}
        {...props}
      >
        {children}
      </td>
    );
  },
  p: ({ children, ...props }: any) => <p className="mb-2.5 last:mb-0 leading-relaxed text-foreground/85" {...props}>{children}</p>,
  ul: ({ children, ...props }: any) => <ul className="my-2 ml-4 list-disc [&>li]:mt-1 marker:text-primary/60 text-foreground/85" {...props}>{children}</ul>,
  ol: ({ children, ...props }: any) => <ol className="my-2 ml-4 list-decimal [&>li]:mt-1 marker:text-primary/60 text-foreground/85" {...props}>{children}</ol>,
  strong: ({ children, ...props }: any) => {
    const text = typeof children === 'string'
      ? children
      : Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? c : '').join('') : '';
    if (isNumericHighlight(String(text))) {
      return (
        <span className="inline-flex items-baseline font-semibold text-primary bg-primary/10 px-1.5 py-0 rounded-sm font-mono tabular-nums" {...props}>
          {children}
        </span>
      );
    }
    return <strong className="font-semibold text-foreground" {...props}>{children}</strong>;
  },
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="my-3 bg-muted/30 border-l-2 border-primary px-4 py-3 italic text-foreground/90 leading-relaxed [&>p]:mb-0 [&>p]:text-foreground/90" {...props}>
      {children}
    </blockquote>
  ),
  em: ({ children, ...props }: any) => {
    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.map((c: any) => typeof c === 'string' ? c : '').join('') : '';
    const isMetadata = /Períodos?:|Escopo:|Período:/i.test(text);
    const isWarning = /Limitação:|Nota:|Aviso:/i.test(text);
    if (isMetadata) {
      const parts = text.split('·').map((s: string) => s.trim()).filter(Boolean);
      return (
        <span className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-border/30">
          {parts.map((part: string, i: number) => {
            const isScope = /^Escopo:/i.test(part);
            return (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] font-bold uppercase tracking-wider",
                  isScope
                    ? "bg-primary/5 border-primary/25 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground"
                )}
              >
                {i === 0 ? <Calendar className="w-3 h-3 shrink-0" /> : <Info className="w-3 h-3 shrink-0" />}
                {part}
              </span>
            );
          })}
        </span>
      );
    }
    if (isWarning) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 my-1 rounded-sm bg-warning/10 border border-warning/20 text-[11px] text-warning">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {children}
        </span>
      );
    }
    return <em {...props}>{children}</em>;
  },
  h1: ({ children }: any) => <SectionLabel>{children}</SectionLabel>,
  h2: ({ children }: any) => <SectionLabel>{children}</SectionLabel>,
  h3: ({ children }: any) => <SectionLabel>{children}</SectionLabel>,
  code: ({ className, children, ...props }: any) => {
    const isInline = !className;
    return isInline
      ? <code className="px-1.5 py-0.5 rounded-sm bg-muted text-xs font-mono text-foreground" {...props}>{children}</code>
      : <code className={cn('block p-3 rounded-sm bg-muted text-xs font-mono overflow-x-auto', className)} {...props}>{children}</code>;
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
          <AgentThinking startedAt={startedAt} softTimeout={message.softTimeout} />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {showSteps && (
          <div className="py-1">
            <AgentSteps
              steps={message.steps!}
              isComplete={hasContent || isComplete}
              startedAt={startedAt}
              collapsed={hasContent}
            />
          </div>
        )}

        {showSkeleton && (
          <div className="space-y-2 py-1 animate-in fade-in duration-300">
            <div className="chat-skeleton-line h-3 w-[92%] rounded" />
            <div className="chat-skeleton-line h-3 w-[78%] rounded" />
            <div className="chat-skeleton-line h-3 w-[55%] rounded" />
          </div>
        )}

        {hasContent && (
          <div className="text-sm leading-relaxed break-words prose-chat">
            <MarkdownBody content={message.content} />
            {isInFlight && (
              <span className="streaming-caret" aria-hidden />
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
