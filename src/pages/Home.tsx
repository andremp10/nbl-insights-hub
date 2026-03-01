import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, TrendingUp, ShoppingBag, ArrowRight, AlertCircle, Users } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/* ── helpers ─────────────────────────────────────────── */

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Bom dia', emoji: '☀️' };
  if (h >= 12 && h < 18) return { text: 'Boa tarde', emoji: '🌤️' };
  return { text: 'Boa noite', emoji: '🌙' };
}

function formatDate(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

/* ── feature cards config ─────────────────────────────── */

const features = [
  {
    tag: 'IA',
    title: 'Assistente de Dados',
    desc: 'Consulte pedidos, clientes, financeiro e muito mais usando linguagem natural. Sem SQL, sem relatórios.',
    icon: MessageSquare,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    path: '/chat',
  },
  {
    tag: 'FINANCEIRO',
    title: 'Dashboard Financeiro',
    desc: 'Acompanhe receitas, despesas, DRE e fluxo de caixa com filtros por período.',
    icon: TrendingUp,
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
    path: '/financeiro',
  },
  {
    tag: 'OPERACIONAL',
    title: 'Gestão de Pedidos',
    desc: 'Visualize status de pedidos, clientes top, faturamento e entregas por período.',
    icon: ShoppingBag,
    iconColor: 'text-chart-3',
    iconBg: 'bg-chart-3/10',
    path: '/pedidos',
  },
];

const suggestions = [
  'Quais os 10 clientes com mais pedidos?',
  'Qual o faturamento do mês atual?',
  'Pedidos com pagamento pendente',
  'Produtos mais vendidos este mês',
  'Clientes que não compram há 60 dias',
  'Qual o ticket médio dos pedidos?',
  'Total de despesas de janeiro',
  'Pedidos em produção agora',
];

/* ── KPI types ─────────────────────────────── */

interface KpiData {
  pedidosHoje: number | null;
  faturamentoMes: number | null;
  pendentes: number | null;
  clientesAtivos: number | null;
}

/* ── Component ───────────────────────────────────────── */

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [kpis, setKpis] = useState<KpiData>({ pedidosHoje: null, faturamentoMes: null, pendentes: null, clientesAtivos: null });
  const [kpisLoading, setKpisLoading] = useState(true);

  const greeting = useMemo(getGreeting, []);
  const dateStr = useMemo(formatDate, []);

  /* quick query handler */
  const handleQuickQuery = (q: string) => {
    if (!q.trim()) return;
    localStorage.setItem('nbl_pending_query', q.trim());
    navigate('/chat');
  };

  /* lazy KPIs */
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
      } catch {
        // KPIs são opcionais
      } finally {
        setKpisLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const kpiCards = [
    { label: 'PEDIDOS HOJE', value: kpis.pedidosHoje !== null ? kpis.pedidosHoje.toString() : '—', sub: 'criados nas últimas 24h', icon: ShoppingBag, color: 'text-chart-3' },
    { label: 'FATURAMENTO MÊS', value: kpis.faturamentoMes !== null ? formatCurrency(kpis.faturamentoMes) : '—', sub: 'mês atual', icon: TrendingUp, color: 'text-success' },
    { label: 'PENDENTES', value: kpis.pendentes !== null ? kpis.pendentes.toString() : '—', sub: 'necessitam atenção', icon: AlertCircle, color: 'text-warning' },
    { label: 'CLIENTES ATIVOS', value: kpis.clientesAtivos !== null ? kpis.clientesAtivos.toString() : '—', sub: 'últimos 30 dias', icon: Users, color: 'text-chart-5' },
  ];

  return (
    <div className="dark min-h-screen bg-background">
      <AppHeader />

      <main className="pt-14">
        <div className="max-w-[900px] mx-auto px-4 md:px-6">
          {/* Hero */}
          <section className="pt-16 pb-12 animate-fade-slide-up">
            <h1 className="text-[32px] font-bold text-foreground mb-2">
              {greeting.text} {greeting.emoji}
            </h1>
            <p className="text-sm text-muted-foreground mb-1 capitalize">{dateStr}</p>
            <p className="text-sm text-muted-foreground/60">Bem-vindo ao painel de inteligência da NBL Gráfica.</p>
          </section>

          {/* Feature Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 animate-fade-slide-up" style={{ animationDelay: '100ms' }}>
            {features.map((f) => (
              <div
                key={f.path}
                onClick={() => navigate(f.path)}
                className="group bg-card border border-border rounded-2xl p-7 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/[0.03] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,80,26,0.12)]"
              >
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-5', f.iconBg)}>
                  <f.icon className={cn('w-5 h-5', f.iconColor)} />
                </div>
                <span className="text-[10px] uppercase tracking-[1px] text-primary font-medium">{f.tag}</span>
                <h3 className="text-lg font-semibold text-foreground mt-2 mb-2">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">{f.desc}</p>
                <span className="text-[13px] text-primary font-medium group-hover:gap-2 inline-flex items-center gap-1 transition-all">
                  Acessar <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            ))}
          </section>

          {/* Quick Query */}
          <section className="mb-8 animate-fade-slide-up" style={{ animationDelay: '200ms' }}>
            <p className="text-xs uppercase tracking-[1px] text-muted-foreground mb-3">Faça uma consulta</p>
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickQuery(query); } }}
                placeholder="Pergunte algo sobre pedidos, clientes, financeiro..."
                className="w-full bg-card border border-border rounded-xl py-4 pl-5 pr-14 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/12 transition-all"
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
          <section className="mb-12 animate-fade-slide-up" style={{ animationDelay: '280ms' }}>
            <p className="text-xs uppercase tracking-[1px] text-muted-foreground mb-3">Sugestões para começar</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickQuery(s)}
                  className="px-4 py-2 rounded-full text-[13px] text-muted-foreground bg-secondary border border-border hover:border-primary hover:text-foreground hover:bg-primary/[0.05] transition-all duration-150 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* KPIs */}
          <section className="pb-16 animate-fade-slide-up" style={{ animationDelay: '360ms' }}>
            <p className="text-xs uppercase tracking-[1px] text-muted-foreground mb-3">Resumo do dia</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {kpiCards.map((k) => (
                <div key={k.label} className="bg-secondary border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <k.icon className={cn('w-4 h-4', k.color)} />
                    <span className="text-[11px] uppercase text-muted-foreground/60 tracking-wide">{k.label}</span>
                  </div>
                  {kpisLoading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{k.value}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/50 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
