import { Bot, TrendingUp, PackageSearch, DollarSign, BarChart3, CreditCard, Wallet, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHIP_EXAMPLES = [
  'Faturamento do mês',
  'Pedidos em produção',
  'Top 10 clientes',
  'Despesas por categoria',
  'Pedidos atrasados',
  'Receita vs despesas',
  'Pagamentos pendentes',
  'Resultado líquido',
];

const QUICK_MODELS = [
  {
    icon: Wallet,
    title: 'Resumo Financeiro',
    description: 'Receitas, despesas e resultado líquido do mês atual',
    query: '[Este mês] [Resumo] Resumo financeiro completo com receitas, despesas e resultado líquido',
  },
  {
    icon: PackageSearch,
    title: 'Status de Pedidos',
    description: 'Visão geral dos pedidos e produção atual',
    query: '[Resumo] Quantos pedidos temos em cada status? Incluir atrasados',
  },
  {
    icon: Users,
    title: 'Top Clientes',
    description: 'Ranking dos clientes que mais compraram',
    query: '[Este mês] [Listar] Top 10 clientes por valor de pedidos',
  },
];

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <div className="text-center max-w-2xl w-full space-y-8">
        {/* Header */}
        <div>
          <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Bot className="h-7 w-7" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-success rounded-full border-2 border-card" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Assistente NBL</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Consulte dados financeiros e de pedidos em linguagem natural.
            <br />
            Escolha um exemplo abaixo ou digite sua pergunta.
          </p>
        </div>

        {/* Chip grid */}
        <div className="flex flex-wrap justify-center gap-2">
          {CHIP_EXAMPLES.map((text) => (
            <button
              key={text}
              onClick={() => onSuggestionClick(text)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border border-border',
                'text-muted-foreground hover:text-foreground',
                'hover:border-primary/40 hover:bg-primary/5',
                'transition-all duration-150'
              )}
            >
              {text}
            </button>
          ))}
        </div>

        {/* Quick models */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelos rápidos</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_MODELS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.title}
                  onClick={() => onSuggestionClick(m.query)}
                  className={cn(
                    'flex flex-col items-start gap-2 p-4 rounded-xl border border-border text-left',
                    'hover:border-primary/40 hover:bg-primary/5',
                    'transition-all duration-150 group'
                  )}
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
