import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowRight, Bot, TrendingUp, PackageSearch, TrendingDown, AlertTriangle, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function formatCurrencyCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return formatCurrency(v);
}

interface HomeKpis {
  receita: number | null;
  despesas: number | null;
  totalPedidos: number | null;
  atrasados: number | null;
}

interface RecentOrder {
  pedido_id: string;
  cliente_nome: string | null;
  data_criacao: string;
  valor_total: number;
  status_pedido: string;
  is_atrasado: boolean;
}

const SUGGESTION_CHIPS = [
  'Faturamento do mês',
  'Pedidos pendentes',
  'Top clientes',
];

const modules = [
  {
    title: 'Assistente',
    description: 'Consulte dados em linguagem natural',
    icon: Bot,
    route: '/chat',
    borderColor: 'border-l-primary',
    preview: null as string | null,
  },
  {
    title: 'Financeiro',
    description: 'Receitas, despesas e resultado',
    icon: TrendingUp,
    route: '/financeiro',
    borderColor: 'border-l-success',
    preview: null as string | null,
  },
  {
    title: 'Pedidos',
    description: 'Status e acompanhamento',
    icon: PackageSearch,
    route: '/pedidos',
    borderColor: 'border-l-info',
    preview: null as string | null,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [kpis, setKpis] = useState<HomeKpis>({ receita: null, despesas: null, totalPedidos: null, atrasados: null });
  const [kpisLoading, setKpisLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const greeting = useMemo(getGreeting, []);
  const dateString = useMemo(() => {
    return format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, []);

  const handleQuickQuery = (q: string) => {
    if (!q.trim()) return;
    localStorage.setItem('nbl_pending_query', q.trim());
    navigate('/chat');
  };

  // Build module previews from KPIs
  const modulesWithPreview = useMemo(() => {
    return modules.map(m => {
      if (m.route === '/financeiro' && kpis.receita !== null) {
        return { ...m, preview: formatCurrencyCompact(kpis.receita) };
      }
      if (m.route === '/pedidos' && kpis.totalPedidos !== null) {
        return { ...m, preview: `${kpis.totalPedidos} pedidos` };
      }
      return m;
    });
  }, [kpis]);

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
          supabase.from('vw_dashboard_pedidos').select('pedido_id, cliente_nome, data_criacao, valor_total, status_pedido, is_atrasado').order('data_criacao', { ascending: false }).limit(5),
        ]);

        const finRow = Array.isArray(finRes.data) ? finRes.data[0] : finRes.data;
        setKpis({
          receita: Number(finRow?.receita || 0),
          despesas: Number(finRow?.despesa || 0),
          totalPedidos: pedRes.count ?? 0,
          atrasados: atrasRes.count ?? 0,
        });
        setRecentOrders((recentRes.data || []) as RecentOrder[]);
      } catch {
        // KPIs são opcionais
      } finally {
        setKpisLoading(false);
        setRecentLoading(false);
      }
    };
    fetchData();
  }, []);

  const kpiCards = [
    { label: 'Receita do mês', value: kpis.receita, format: formatCurrency, variant: 'text-success' },
    { label: 'Despesas do mês', value: kpis.despesas, format: formatCurrency, variant: 'text-destructive' },
    { label: 'Total de pedidos', value: kpis.totalPedidos, format: (v: number) => v.toString(), variant: 'text-info' },
    { label: 'Atrasados', value: kpis.atrasados, format: (v: number) => v.toString(), variant: 'text-warning' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[880px] mx-auto px-4 md:px-8 py-10 md:py-16 space-y-8">

        {/* Hero */}
        <section>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dateString}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte pedidos e financeiro em tempo real
          </p>
        </section>

        {/* Search bar */}
        <section>
          <div className="relative rounded-lg border border-border bg-card">
            <div className="relative flex items-center">
              <MessageSquare className="absolute left-3.5 w-4 h-4 text-muted-foreground/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickQuery(query); } }}
                placeholder="Pergunte algo sobre pedidos ou financeiro..."
                className="w-full bg-transparent py-3 pl-10 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none rounded-lg"
              />
              <button
                onClick={() => handleQuickQuery(query)}
                disabled={!query.trim()}
                aria-label="Enviar consulta"
                className="absolute right-2.5 w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleQuickQuery(chip)}
                className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        {/* KPIs */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpiCards.map((k) => (
              <div key={k.label} className="bg-card border border-border rounded-lg p-4">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</span>
                {kpisLoading ? (
                  <Skeleton className="h-7 w-20 mt-1.5" />
                ) : (
                  <p className={cn('text-xl font-semibold mt-1 tabular-nums', k.variant)}>
                    {k.value !== null ? k.format(k.value) : '—'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Module tiles */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Acesso rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {modulesWithPreview.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  onClick={() => navigate(mod.route)}
                  className={cn(
                    'bg-card border border-border rounded-lg p-4 cursor-pointer border-l-[3px] transition-colors hover:border-primary/40',
                    mod.borderColor
                  )}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{mod.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                  {mod.preview && !kpisLoading && (
                    <p className="text-xs text-primary font-medium mt-2">{mod.preview}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Atividade recente</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-6 text-center">
                  <Package className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum pedido recente</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y divide-border">
                  {recentOrders.map((order) => (
                    <div key={order.pedido_id} className="flex items-center justify-between py-2.5 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {order.cliente_nome || 'Cliente não identificado'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(order.data_criacao), 'dd/MM/yy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
