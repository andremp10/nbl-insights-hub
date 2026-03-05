import { Bot, Wallet, PackageSearch, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const STRUCTURED_PROMPTS = [
  'Qual o faturamento total do mês atual? Compare com o mês anterior e mostre a variação percentual',
  'Liste os 10 maiores clientes por valor total de pedidos nos últimos 30 dias, em formato de ranking',
  'Quais pedidos estão atrasados neste momento? Mostre cliente, valor e dias de atraso',
  'Resumo financeiro do mês atual: receita total, despesas totais e resultado líquido',
  'Quais as 5 maiores categorias de despesa dos últimos 30 dias? Mostre valor e percentual do total',
  'Quantos pedidos temos em cada status atualmente? Mostre em formato de resumo',
  'Compare receita e despesas dos últimos 3 meses, mês a mês',
  'Quais pagamentos ou contas estão pendentes? Liste por valor e data de vencimento',
];

const QUICK_MODELS = [
  {
    icon: Wallet,
    title: 'Resumo Financeiro',
    description: 'Receitas, despesas e resultado líquido com as maiores categorias de custo',
    query: 'Gere um resumo financeiro completo do mês atual. Inclua receita total, despesas totais, resultado líquido e as 3 maiores categorias de despesa com valores',
  },
  {
    icon: PackageSearch,
    title: 'Status de Pedidos',
    description: 'Visão geral dos pedidos por status e alertas de atraso',
    query: 'Faça um resumo do status atual de todos os pedidos. Quantos estão aprovados, em produção, concluídos e atrasados? Destaque os que precisam de atenção',
  },
  {
    icon: Users,
    title: 'Top Clientes',
    description: 'Ranking dos clientes com maior volume de compras no mês',
    query: 'Mostre o ranking dos 10 maiores clientes por valor total de pedidos no mês atual, com nome e valor total de cada um',
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
            Escolha uma sugestão abaixo ou digite sua pergunta.
          </p>
        </div>

        {/* Structured prompts grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          {STRUCTURED_PROMPTS.map((text) => (
            <button
              key={text}
              onClick={() => onSuggestionClick(text)}
              className={cn(
                'text-sm px-3.5 py-3 rounded-xl border border-border text-left',
                'text-muted-foreground hover:text-foreground',
                'hover:border-primary/40 hover:bg-primary/5',
                'transition-all duration-150 line-clamp-2'
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
