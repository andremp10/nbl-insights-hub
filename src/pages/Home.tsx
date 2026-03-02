import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, TrendingUp, ShoppingBag, ArrowRight, AlertCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Bom dia', emoji: '☀️' };
  if (h >= 12 && h < 18) return { text: 'Boa tarde', emoji: '🌤️' };
  return { text: 'Boa noite', emoji: '🌙' };
}

function formatDate(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

const suggestions = [
  'Quais os 10 clientes com mais pedidos?',
  'Qual o faturamento do mês atual?',
  'Pedidos com pagamento pendente',
  'Produtos mais vendidos este mês',
  'Total de despesas de janeiro',
  'Pedidos em produção agora',
];

interface KpiData {
  pedidosHoje: number | null;
  faturamentoMes: number | null;
  pendentes: number | null;
  clientesAtivos: number | null;
}

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [kpis, setKpis] = useState<KpiData>({ pedidosHoje: null, faturamentoMes: null, pendentes: null, clientesAtivos: null });
  const [kpisLoading, setKpisLoading] = useState(true);

  const greeting = useMemo(getGreeting, []);
  const dateStr = useMemo(formatDate, []);

  const handleQuickQuery = (q: string) => {
    if (!q.trim()) return;
    localStorage.setItem('nbl_pending_query', q.trim());
    navigate('/chat');
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

        const [resToday, resMonth, resPend, resClients] = await Promise.all([
          supabase.from('vw_dashboard_pedidos').select('pedido_id', { count: 'exact', head: true }).gte('data_criacao', startOfDay),
          supabase.from('vw_dashboard_pedidos').select('valor_total').gte('data_criacao', startOfMonth),
          supabase.from('vw_dashboard_pedidos').select('pedido_id', { count: 'exact', head: true }).in('status_pedido', ['Aguardando Pagamento', 'Pendente']),
          supabase.from('vw_dashboard_pedidos').select('cliente_id').gte('data_criacao', thirtyDaysAgo),
        ]);

        const faturamento = (resMonth.data || []).reduce((s, r) => s + (Number(r.valor_total) || 0), 0);
        const uniqueClients = new Set((resClients.data || []).map(r => r.cliente_id)).size;

        setKpis({
          pedidosHoje: resToday.count ?? 0,
          faturamentoMes: faturamento,
          pendentes: resPend.count ?? 0,
          clientesAtivos: uniqueClients,
        });
      } catch { /* KPIs são opcionais */ } finally {
        setKpisLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const kpiCards = [
    { label: 'Pedidos hoje', value: kpis.pedidosHoje !== null ? kpis.pedidosHoje.toString() : '—', icon: ShoppingBag, color: 'text-chart-3' },
    { label: 'Faturamento mês', value: kpis.faturamentoMes !== null ? formatCurrency(kpis.faturamentoMes) : '—', icon: TrendingUp, color: 'text-success' },
    { label: 'Pendentes', value: kpis.pendentes !== null ? kpis.pendentes.toString() : '—', icon: AlertCircle, color: 'text-warning' },
    { label: 'Clientes ativos', value: kpis.clientesAtivos !== null ? kpis.clientesAtivos.toString() : '—', icon: Users, color: 'text-chart-5' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-4 md:px-6 py-12 md:py-20">
        {/* Greeting */}
        <section className="mb-10 animate-fade-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">
            {greeting.text} {greeting.emoji}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
        </section>

        {/* Quick Query — main focus */}
        <section className="mb-6 animate-fade-slide-up" style={{ animationDelay: '80ms' }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-3 font-medium">
            Assistente de Dados
          </p>
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickQuery(query); } }}
              placeholder="Pergunte algo sobre pedidos, clientes, financeiro..."
              className="w-full bg-card border border-border rounded-2xl py-4 pl-5 pr-14 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/12 transition-all"
            />
            <button
              onClick={() => handleQuickQuery(query)}
              disabled={!query.trim()}
              aria-label="Enviar consulta"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Suggestions */}
        <section className="mb-12 animate-fade-slide-up" style={{ animationDelay: '160ms' }}>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleQuickQuery(s)}
                className="px-3.5 py-1.5 rounded-full text-xs text-muted-foreground bg-secondary border border-border hover:border-primary hover:text-foreground hover:bg-primary/[0.05] transition-all duration-150 cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Navigation Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 animate-fade-slide-up" style={{ animationDelay: '240ms' }}>
          <div
            onClick={() => navigate('/financeiro')}
            className="group bg-card border border-border rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Financeiro</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Receitas, despesas, DRE e fluxo de caixa</p>
          </div>
          <div
            onClick={() => navigate('/pedidos')}
            className="group bg-card border border-border rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-chart-3" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Pedidos</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Status, clientes top, faturamento por período</p>
          </div>
        </section>

        {/* KPIs — subtle */}
        <section className="animate-fade-slide-up" style={{ animationDelay: '320ms' }}>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-3 font-medium">Resumo</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpiCards.map((k) => (
              <div key={k.label} className="bg-secondary/50 border border-border/50 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <k.icon className={cn('w-3.5 h-3.5', k.color)} />
                  <span className="text-[10px] uppercase text-muted-foreground/60 tracking-wide">{k.label}</span>
                </div>
                {kpisLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-lg font-bold text-foreground">{k.value}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
