import { memo } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Quais são os 10 clientes com mais pedidos?',
  'Qual o faturamento do mês atual?',
  'Quais pedidos estão com pagamento pendente?',
  'Quais produtos mais vendidos neste mês?',
  'Clientes que não compram há mais de 60 dias?',
  'Qual o ticket médio dos pedidos?',
  'Quais as principais despesas do mês?',
  'Quantos pedidos foram feitos esta semana?',
];

interface ChatSuggestionsPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (suggestion: string) => void;
}

export const ChatSuggestionsPanel = memo(function ChatSuggestionsPanel({
  collapsed,
  onToggle,
  onSelect,
}: ChatSuggestionsPanelProps) {
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border bg-sidebar-background transition-all duration-200 relative',
        collapsed ? 'w-0 overflow-hidden border-r-0' : 'w-60'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Abrir sugestões' : 'Fechar sugestões'}
        className={cn(
          'absolute top-4 z-20 flex items-center justify-center w-6 h-6 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
          collapsed ? '-right-3' : '-right-3'
        )}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {!collapsed && (
        <>
          <div className="px-4 pt-5 pb-3">
            <p className="text-[11px] uppercase tracking-[1px] font-medium text-muted-foreground">
              Consultas Frequentes
            </p>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4 space-y-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => onSelect(s)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-[13px] leading-snug',
                  'border border-border text-muted-foreground',
                  'hover:border-primary/50 hover:bg-primary/5 hover:text-foreground',
                  'transition-all duration-150 cursor-pointer'
                )}
              >
                <Search className="w-3 h-3 inline-block mr-2 opacity-40" />
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
});
