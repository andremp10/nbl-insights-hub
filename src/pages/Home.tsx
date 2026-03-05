import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Wallet, PackageSearch, Package, TrendingUp, AlertTriangle, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

interface HomeKpis {
  totalPedidos: number | null;
  atrasados: number | null;
  resultado: number | null;
}

interface RecentOrder {
  pedido_id: string;
  cliente_nome: string | null;
  data_criacao: string;
  valor_total: number;
  status_pedido: string;
  is_atrasado: boolean;
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
  const [kpis, setKpis] = useState<HomeKpis>({ totalPedidos: null, atrasados: null, resultado: null });
  const [kpisLoading, setKpisLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const [finRes, pedRes, atrasRes, recentRes] = await Promise.all([
          supabase.rpc('get_financeiro_kpis', { p_data_inicio: startOfMonth, p_data_fim: endOfMonth }),
          supabase.from('vw_dashboard_pedidos').select('pedido_id', { count: 'exact', head: true }).gte('data_criacao', startOfMonth).lte('data_criacao', endOfMonth + 'T23:59:59'),
          supabase.from('vw_dashboard_pedidos').select('pedido_id', { count: 'exact', head: true }).eq('is_atrasado', true).eq('is_finalizado', false),
          supabase.from('vw_dashboard_pedidos').select('pedido_id, cliente_nome, data_criacao, valor_total, status_pedido, is_atrasado').order('data_criacao', { ascending: false }).limit(4),
        ]);

        const finRow = Array.isArray(finRes.data) ? finRes.data[0] : finRes.data;
        const receita = Number(finRow?.receita || 0);
        const despesa = Number(finRow?.despesa || 0);

        setKpis({
          totalPedidos: pedRes.count ?? 0,
          atrasados: atrasRes.count ?? 0,
          resultado: receita - despesa,
        });
        setRecentOrders((recentRes.data || []) as RecentOrder[]);
      } catch {
        // KPIs são opcionais na home
      } finally {
        setKpisLoading(false);
        setRecentLoading(false);
      }
    };
    fetchData();
  }, []);

  const kpiItems = [
    { label: 'Pedidos em aberto', value: kpis.totalPedidos, format: (v: number) => v.toString(), icon: ShoppingBag, color: 'text-info' },
    { label: 'Atrasados', value: kpis.atrasados, format: (v: number) => v.toString(), icon: AlertTriangle, color: 'text-warning' },
    { label: 'Resultado do mês', value: kpis.resultado, format: formatCurrency, icon: TrendingUp, color: kpis.resultado !== null && kpis.resultado >= 0 ? 'text-success' : 'text-destructive' },
  ];

  const hasKpiData = kpiItems.some(k => k.value !== null && k.value !== 0) || kpisLoading;

  return (
    <div className="flex-1 overflow-y-auto auth-grid-bg">
      <div className="max-w-4xl mx-auto px-4 md:px-8">

        {/* ── Hero Institucional ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="pt-10 pb-6 md:pt-16 md:pb-8"
        >
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
        </motion.section>

        {/* ── Cards de Navegação ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
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
        </motion.section>

        {/* ── KPIs Discretos ── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.14 }}
          className="mt-8"
        >
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
        </motion.section>

        {/* ── Atividade Recente ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="mt-8 pb-12"
        >
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
        </motion.section>

      </div>
    </div>
  );
}
