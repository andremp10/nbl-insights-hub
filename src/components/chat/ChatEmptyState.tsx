import { Bot, Wallet, PackageSearch, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  { title: 'Faturamento vs mês anterior', prompt: 'Qual o faturamento total do mês atual? Compare com o mês anterior e mostre a variação percentual' },
  { title: 'Top 10 clientes', prompt: 'Liste os 10 maiores clientes por valor total de pedidos nos últimos 30 dias, em formato de ranking' },
  { title: 'Pedidos atrasados', prompt: 'Quais pedidos estão atrasados neste momento? Mostre cliente, valor e dias de atraso' },
  { title: 'Resumo financeiro', prompt: 'Resumo financeiro do mês atual: receita total, despesas totais e resultado líquido' },
  { title: 'Maiores despesas', prompt: 'Quais as 5 maiores categorias de despesa dos últimos 30 dias? Mostre valor e percentual do total' },
  { title: 'Status dos pedidos', prompt: 'Quantos pedidos temos em cada status atualmente? Mostre em formato de resumo' },
];

const QUICK_MODELS = [
  {
    icon: Wallet,
    title: 'Resumo Financeiro',
    description: 'Receitas, despesas e resultado',
    query: 'Gere um resumo financeiro completo do mês atual. Inclua receita total, despesas totais, resultado líquido e as 3 maiores categorias de despesa com valores',
  },
  {
    icon: PackageSearch,
    title: 'Status de Pedidos',
    description: 'Visão geral e alertas',
    query: 'Faça um resumo do status atual de todos os pedidos. Quantos estão aprovados, em produção, concluídos e atrasados? Destaque os que precisam de atenção',
  },
  {
    icon: Users,
    title: 'Top Clientes',
    description: 'Ranking por volume',
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
        <div className="space-y-3">
          <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Como posso ajudar?</h2>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Consulte dados financeiros e de pedidos em linguagem natural.
            </p>
          </div>
        </div>

        {/* Quick models — prominent cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {QUICK_MODELS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.title}
                onClick={() => onSuggestionClick(m.query)}
                className={cn(
                  'flex flex-col items-start gap-2.5 p-4 rounded-xl border border-border/50 text-left',
                  'hover:border-primary/40 hover:bg-primary/5',
                  'transition-all duration-200 group'
                )}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60 group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Suggestion chips */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-medium text-muted-foreground/40 uppercase tracking-wider">Sugestões rápidas</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.title}
                onClick={() => onSuggestionClick(s.prompt)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border border-border/40',
                  'text-muted-foreground/70 hover:text-foreground',
                  'hover:border-primary/30 hover:bg-primary/5',
                  'transition-all duration-150'
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
