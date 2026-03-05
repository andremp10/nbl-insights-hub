import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Qual o faturamento deste mês?',
  'Pedidos em produção agora',
  'Comparar receita vs despesas do mês',
  'Pedidos com pagamento pendente',
];

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      <div className="text-center max-w-lg w-full">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Assistente NBL Gráfica
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Consulte dados em linguagem natural. Escolha uma sugestão ou digite sua pergunta.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestionClick(s)}
              className={cn(
                'px-3.5 py-2 rounded-md border border-border text-sm',
                'text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5',
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
