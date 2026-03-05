import { Bot, TrendingUp, PackageSearch, DollarSign, BarChart3, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  { icon: TrendingUp, title: 'Faturamento do mês', description: 'Consulte a receita total do período' },
  { icon: PackageSearch, title: 'Pedidos em produção agora', description: 'Veja o que está sendo produzido' },
  { icon: BarChart3, title: 'Comparar receita vs despesas', description: 'Resultado líquido do mês' },
  { icon: CreditCard, title: 'Pedidos com pagamento pendente', description: 'Pagamentos aguardando aprovação' },
  { icon: DollarSign, title: 'Top categorias de despesa', description: 'Onde está indo o dinheiro' },
  { icon: PackageSearch, title: 'Pedidos atrasados', description: 'Pedidos fora do prazo previsto' },
];

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      <div className="text-center max-w-lg w-full">
        {/* Bot icon with online badge */}
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
          <Bot className="h-8 w-8" />
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-card" />
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-1">
          Assistente NBL Gráfica
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Consulte dados em linguagem natural. Escolha uma sugestão ou digite sua pergunta.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.title}
                onClick={() => onSuggestionClick(s.title)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border border-border text-left',
                  'hover:border-primary/40 hover:bg-primary/5',
                  'transition-all duration-150'
                )}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
