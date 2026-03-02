import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Faturamento do mês atual',
  'Top 10 clientes',
  'Pedidos pendentes',
];

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Assistente NBL Gráfica
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Consulte dados em linguagem natural
        </p>
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(s)}
              className={cn(
                'text-left px-4 py-3 rounded-xl text-sm border border-border',
                'text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5',
                'transition-all duration-150'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
