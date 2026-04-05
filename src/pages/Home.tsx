import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Wallet, PackageSearch, Package, TrendingUp, AlertTriangle, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHomeKPIs, useRecentOrders } from '@/hooks/useHomeData';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const NAV_CARDS = [
  {
    title: 'Assistente IA',
    description: 'Consulte dados em linguagem natural e obtenha respostas instantâneas',
    icon: Bot,
    route: '/chat',
    accent: 'border-l-primary',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  {
    title: 'Pedidos',
    description: 'Acompanhe status, prazos de entrega e produção em tempo real',
    icon: PackageSearch,
    route: '/pedidos',
    accent: 'border-l-info',
    iconColor: 'text-info',
    iconBg: 'bg-info/10',
  },
  {
    title: 'Financeiro',
    description: 'Visualize receitas, despesas e resultado líquido do período',
    icon: Wallet,
    route: '/financeiro',
    accent: 'border-l-success',
    iconColor: 'text-success',
    iconBg: 'bg-success/10',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading } = useHomeKPIs();
  const { data: recentOrders = [], isLoading: recentLoading } = useRecentOrders();

  const kpiItems = [
    { label: 'Pedidos em aberto', value: kpis?.totalPedidos ?? null, format: (v: number) => v.toString(), icon: ShoppingBag, color: 'text-info' },
    { label: 'Atrasados', value: kpis?.atrasados ?? null, format: (v: number) => v.toString(), icon: AlertTriangle, color: 'text-warning' },
    { label: 'Resultado do mês', value: kpis?.resultado ?? null, format: formatCurrency, icon: TrendingUp, color: kpis && kpis.resultado >= 0 ? 'text-success' : 'text-destructive' },
  ];

  const hasKpiData = kpiItems.some(k => k.value !== null && k.value !== 0) || kpisLoading;

  return (
    <div className="flex-1 overflow-y-auto auth-grid-bg">
      <div className="max-w-4xl mx-auto px-4 md:px-8">

        {/* ── Hero Institucional ── */}
        <section className="pt-10 pb-6 md:pt-16 md:pb-8 animate-page-in">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
            Bem-vindo à plataforma de inteligência da NBL
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
            Consulte dados operacionais, acompanhe pedidos e visualize o financeiro em um só lugar.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Button onClick={() => navigate('/chat')} size="default" className="gap-2">
              <Bot className="w-4 h-4" />
              Abrir Assistente
            </Button>
            <Button onClick={() => navigate('/pedidos')} variant="outline" size="default" className="gap-2">
              <PackageSearch className="w-4 h-4" />
              Ver Pedidos
            </Button>
            <Button onClick={() => navigate('/financeiro')} variant="outline" size="default" className="gap-2">
              <Wallet className="w-4 h-4" />
              Ver Financeiro
            </Button>
          </div>
        </section>

        {/* ── Cards de Navegação ── */}
        <section className="animate-page-in" style={{ animationDelay: '50ms' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {NAV_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.route}
                  onClick={() => navigate(card.route)}
                  className={cn(
                    'group flex items-start gap-3.5 p-5 rounded-xl border border-border bg-card text-left',
                    'border-l-2 transition-all duration-200',
                    'hover:border-primary/30 hover:shadow-sm hover:bg-accent/40',
                    card.accent
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', card.iconBg)}>
                    <Icon className={cn('w-5 h-5', card.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground">{card.title}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{card.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
                </button>
              );
            })}
          </div>
        </section>

        {/* ── KPIs Discretos ── */}
        <section className="mt-8 animate-page-in" style={{ animationDelay: '100ms' }}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
            Indicadores do mês
          </p>
          {hasKpiData ? (
            <div className="grid grid-cols-3 gap-3">
              {kpiItems.map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn('w-3.5 h-3.5', k.color)} />
                      <span className="text-[11px] text-muted-foreground">{k.label}</span>
                    </div>
                    {kpisLoading ? (
                      <Skeleton className="h-6 w-16" />
                    ) : (
                      <span className={cn('text-lg font-semibold tabular-nums', k.color)}>
                        {k.value !== null ? k.format(k.value) : '—'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Os indicadores aparecerão aqui quando houver dados disponíveis.
              </p>
            </div>
          )}
        </section>

        {/* ── Atividade Recente ── */}
        <section className="mt-8 pb-12 animate-page-in" style={{ animationDelay: '150ms' }}>
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Atividade recente
              </p>
              <button
                onClick={() => navigate('/pedidos')}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="px-5 pb-4">
              {recentLoading ? (
                <div className="space-y-2.5">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-6 text-center">
                  <Package className="h-7 w-7 text-muted-foreground/20 mx-auto mb-1.5" />
                  <p className="text-sm text-muted-foreground">Nenhum pedido recente</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentOrders.map((order) => {
                    const name = order.cliente_nome || 'Cliente';
                    return (
                      <div key={order.pedido_id} className="flex items-center gap-3 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-semibold text-muted-foreground">{getInitials(name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(order.data_criacao), 'dd/MM/yy', { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-sm font-medium text-foreground tabular-nums">
                            {formatCurrency(order.valor_total)}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              order.is_atrasado
                                ? 'bg-destructive/10 text-destructive border-destructive/30'
                                : order.status_pedido === 'Finalizado'
                                ? 'bg-success/10 text-success border-success/30'
                                : 'bg-muted text-muted-foreground border-border'
                            )}
                          >
                            {order.is_atrasado ? 'Atrasado' : order.status_pedido}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
