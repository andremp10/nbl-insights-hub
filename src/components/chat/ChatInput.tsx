import { useState, useRef, useCallback } from 'react';
import { ArrowUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  isLoading: boolean;
  onSuggestionFill?: string;
}

export function ChatInput({ onSend, onCancel, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Allow parent to fill suggestion
  const fillSuggestion = useCallback((text: string) => {
    setValue(text);
    setTimeout(() => {
      textareaRef.current?.focus();
      adjustHeight();
    }, 0);
  }, [adjustHeight]);

  // Expose via ref isn't needed; parent passes via prop. We use a simpler approach.
  // Parent will call onSend directly or set value through a different mechanism.

  return (
    <div className="border-t border-border bg-sidebar-background px-4 py-3 md:px-6">
      <div className="max-w-3xl mx-auto relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo sobre pedidos, clientes, financeiro..."
          disabled={isLoading}
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

        {/* Send / Cancel button */}
        <div className="absolute right-2 bottom-2">
          {isLoading ? (
            <button
              onClick={onCancel}
              aria-label="Cancelar consulta"
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg',
                'bg-destructive text-destructive-foreground',
                'hover:bg-destructive/90 transition-colors'
              )}
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              aria-label="Enviar mensagem"
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                value.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Export fillSuggestion helper for parent
ChatInput.fillSuggestion = (ref: React.RefObject<HTMLTextAreaElement>, text: string) => {
  // Not used - parent manages via state
};
