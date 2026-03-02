import { useState, useRef, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => Promise<void> | void;
  sending: boolean;
}

export function ChatInput({ onSend, sending }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef(false);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const handleSubmit = useCallback(() => {
    if (submitRef.current || sending || !input.trim()) return;
    submitRef.current = true;
    const msg = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    Promise.resolve(onSend(msg)).finally(() => {
      submitRef.current = false;
    });
  }, [input, sending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !sending) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Allow parent to fill suggestion text
  const fillSuggestion = useCallback((text: string) => {
    setInput(text);
    setTimeout(() => {
      textareaRef.current?.focus();
      adjustHeight();
    }, 0);
  }, [adjustHeight]);

  return (
    <div className="border-t border-border bg-sidebar-background px-4 py-3 md:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            disabled={sending}
            onChange={(e) => {
              if (!sending) {
                setInput(e.target.value);
                adjustHeight();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo sobre pedidos, clientes, financeiro..."
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-14 text-sm',
              'text-foreground placeholder:text-muted-foreground/60',
              'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-all duration-200'
            )}
            style={{ minHeight: '48px', maxHeight: '120px' }}
            aria-label="Campo de mensagem"
          />

          <div className="absolute right-2 bottom-2">
            <button
              onClick={handleSubmit}
              disabled={sending || !input.trim()}
              aria-label="Enviar mensagem"
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                !sending && input.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sending status */}
        {sending && (
          <p className="text-center text-xs text-muted-foreground mt-2 animate-pulse">
            Aguardando resposta...
          </p>
        )}
      </div>
    </div>
  );
}

// Expose fillSuggestion via imperative handle pattern
ChatInput.fillSuggestion = () => {};
