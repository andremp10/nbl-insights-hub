import { useState, useMemo } from 'react';
import { Wallet, PackageSearch, Users, Sparkles, Search, MessageSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  { title: 'Faturamento vs mês anterior', module: 'Financeiro', prompt: 'Qual o faturamento total do mês atual? Compare com o mês anterior e mostre a variação percentual' },
  { title: 'Top 10 clientes', module: 'Clientes', prompt: 'Liste os 10 maiores clientes por valor total de pedidos nos últimos 30 dias, em formato de ranking' },
  { title: 'Pedidos atrasados', module: 'Pedidos', prompt: 'Quais pedidos estão atrasados neste momento? Mostre cliente, valor e dias de atraso' },
  { title: 'Resumo financeiro', module: 'Financeiro', prompt: 'Resumo financeiro do mês atual: receita total, despesas totais e resultado líquido' },
  { title: 'Maiores despesas', module: 'Financeiro', prompt: 'Quais as 5 maiores categorias de despesa dos últimos 30 dias? Mostre valor e percentual do total' },
  { title: 'Status dos pedidos', module: 'Pedidos', prompt: 'Quantos pedidos temos em cada status atualmente? Mostre em formato de resumo' },
  { title: 'Clientes inativos', module: 'Clientes', prompt: 'Quais clientes não fazem pedidos há mais de 60 dias? Liste os 20 com maior histórico de compras' },
  { title: 'Ticket médio', module: 'Pedidos', prompt: 'Qual o ticket médio dos pedidos no mês atual?' },
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

interface RecentSession {
  id: string;
  title: string;
  last_message_at: string | null;
}

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
  recentSessions?: RecentSession[];
  onSelectSession?: (id: string) => void;
}

function formatRel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function ChatEmptyState({ onSuggestionClick, recentSessions = [], onSelectSession }: ChatEmptyStateProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return SUGGESTIONS;
    const q = search.toLowerCase();
    return SUGGESTIONS.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.module.toLowerCase().includes(q) ||
      s.prompt.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="flex flex-col items-center justify-start min-h-full px-3 sm:px-4 py-8 sm:py-12">
      <div className="text-center max-w-2xl w-full space-y-7">
        {/* Header */}
        <div className="space-y-3">
          <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Como posso ajudar?</h2>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Consulte dados financeiros, pedidos e clientes em linguagem natural.
            </p>
          </div>
        </div>

        {/* Continuar de onde parei */}
        {recentSessions.length > 0 && onSelectSession && (
          <div className="text-left space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 px-1">
              Continuar de onde parei
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {recentSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 text-left',
                    'hover:border-primary/40 hover:bg-primary/5 transition-all duration-150'
                  )}
                >
                  <MessageSquare className="w-3 h-3 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  <span className="flex-1 min-w-0 truncate text-xs text-foreground/80 group-hover:text-foreground">
                    {s.title}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/40">{formatRel(s.last_message_at)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick models */}
        <div className="text-left space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 px-1">
            Modelos rápidos
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {QUICK_MODELS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.title}
                  onClick={() => onSuggestionClick(m.query)}
                  className={cn(
                    'flex flex-col items-start gap-2.5 p-3 sm:p-4 rounded-xl border border-border/50 text-left',
                    'hover:border-primary/40 hover:bg-primary/5',
                    'transition-all duration-150 group'
                  )}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60 group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{m.description}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-all -ml-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Catálogo de perguntas com busca */}
        <div className="text-left space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              Catálogo de perguntas
            </p>
            <span className="text-[10px] text-muted-foreground/40 font-mono tabular-nums">
              {filtered.length}/{SUGGESTIONS.length}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar exemplos de perguntas..."
              className={cn(
                'w-full h-9 pl-8 pr-3 rounded-lg bg-muted/30 border border-border/60',
                'text-xs text-foreground placeholder:text-muted-foreground/50',
                'hover:bg-muted/50',
                'focus:outline-none focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/15 transition-all'
              )}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 px-1 py-2">Nenhum exemplo corresponde à busca.</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.title}
                  onClick={() => onSuggestionClick(s.prompt)}
                  className={cn(
                    'group inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-border/40',
                    'text-muted-foreground/80 hover:text-foreground',
                    'hover:border-primary/30 hover:bg-primary/5',
                    'transition-all duration-150'
                  )}
                >
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/40 group-hover:text-primary/70 transition-colors">
                    {s.module.slice(0, 3)}
                  </span>
                  <span>{s.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
