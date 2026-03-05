import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowRight, Bot, Wallet, PackageSearch, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

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

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
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
    title: 'Assistente IA',
    description: 'Consulte dados em linguagem natural. Pergunte sobre pedidos, financeiro e clientes.',
    icon: Bot,
    route: '/chat',
    gradient: 'from-primary/8 to-transparent',
    iconBg: 'bg-primary/10 text-primary',
    accentColor: 'border-l-primary',
  },
  {
    title: 'Financeiro',
    description: 'Receitas, despesas e resultado líquido. Visualize gráficos e composição de custos.',
    icon: Wallet,
    route: '/financeiro',
    gradient: 'from-success/8 to-transparent',
    iconBg: 'bg-success/10 text-success',
    accentColor: 'border-l-success',
  },
  {
    title: 'Pedidos',
    description: 'Acompanhe status, prazos, clientes e produção em tempo real.',
    icon: PackageSearch,
    route: '/pedidos',
    gradient: 'from-info/8 to-transparent',
    iconBg: 'bg-info/10 text-info',
    accentColor: 'border-l-info',
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
    return format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  }, []);

  const handleQuickQuery = (q: string) => {
    if (!q.trim()) return;
    localStorage.setItem('nbl_pending_query', q.trim());
    navigate('/chat');
  };

  const modulesWithPreview = useMemo(() => {
    return modules.map(m => {
      if (m.route === '/financeiro' && kpis.receita !== null) {
        return { ...m, preview: formatCurrencyCompact(kpis.receita), previewLabel: 'Receita este mês' };
      }
      if (m.route === '/pedidos' && kpis.totalPedidos !== null) {
        return { ...m, preview: `${kpis.totalPedidos}`, previewLabel: 'pedidos este mês' };
      }
      return { ...m, preview: null as string | null, previewLabel: null as string | null };
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

  const kpiItems = [
    { label: 'Receita', value: kpis.receita, format: formatCurrency, color: 'text-success' },
    { label: 'Despesas', value: kpis.despesas, format: formatCurrency, color: 'text-destructive' },
    { label: 'Pedidos', value: kpis.totalPedidos, format: (v: number) => v.toString(), color: 'text-info' },
    { label: 'Atrasados', value: kpis.atrasados, format: (v: number) => v.toString(), color: 'text-warning' },
  ];

  const resultado = kpis.receita !== null && kpis.despesas !== null ? kpis.receita - kpis.despesas : null;

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Hero Section ── */}
      <section className="px-4 md:px-8 pt-12 pb-8 md:pt-20 md:pb-12 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            {greeting} 👋
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-normal capitalize">
              {dateString}
            </Badge>
          </div>
          <p className="text-base text-muted-foreground mt-3 max-w-lg">
            Consulte dados operacionais, acompanhe pedidos e analise o financeiro da NBL Gráfica.
          </p>
        </motion.div>

        {/* Search integrated in hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8"
        >
          <div className="relative rounded-xl border border-border bg-card shadow-sm">
            <div className="relative flex items-center">
              <MessageSquare className="absolute left-4 w-5 h-5 text-muted-foreground/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickQuery(query); } }}
                placeholder="Pergunte algo ao assistente..."
                className="w-full bg-transparent py-4 pl-12 pr-14 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none rounded-xl"
              />
              <button
                onClick={() => handleQuickQuery(query)}
                disabled={!query.trim()}
                aria-label="Enviar consulta"
                className="absolute right-3 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-20 hover:bg-primary/90 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleQuickQuery(chip)}
                className="px-3.5 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Module Cards ── */}
      <section className="px-4 md:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {modulesWithPreview.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                onClick={() => navigate(mod.route)}
                className={cn(
                  'group relative bg-card border border-border rounded-xl cursor-pointer overflow-hidden',
                  'border-l-[4px] transition-all duration-200',
                  'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1',
                  mod.accentColor
                )}
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300', mod.gradient)} />
                <div className="relative p-6 md:p-8">
                  <div className={cn('flex items-center justify-center w-14 h-14 rounded-xl mb-5 transition-transform duration-200 group-hover:scale-110', mod.iconBg)}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1.5">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{mod.description}</p>
                  
                  {mod.preview && !kpisLoading ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-foreground">{mod.preview}</span>
                      <span className="text-xs text-muted-foreground">{mod.previewLabel}</span>
                    </div>
                  ) : kpisLoading && mod.route !== '/chat' ? (
                    <Skeleton className="h-6 w-28" />
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── KPI Ribbon ── */}
      <section className="px-4 md:px-8 mt-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-xl bg-muted/30 py-5 px-6"
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">Resumo do mês</p>
          <div className="flex flex-wrap items-center gap-y-3">
            {kpiItems.map((k, i) => (
              <div key={k.label} className="flex items-center">
                {i > 0 && <div className="hidden md:block w-px h-8 bg-border mx-6" />}
                <div className={cn('pr-6 md:pr-0', i > 0 && 'pl-0')}>
                  <span className="text-[11px] text-muted-foreground block">{k.label}</span>
                  {kpisLoading ? (
                    <Skeleton className="h-7 w-20 mt-0.5" />
                  ) : (
                    <span className={cn('text-xl font-semibold tabular-nums', k.color)}>
                      {k.value !== null ? k.format(k.value) : '—'}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Resultado líquido */}
            <div className="flex items-center">
              <div className="hidden md:block w-px h-8 bg-border mx-6" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Resultado</span>
                {kpisLoading ? (
                  <Skeleton className="h-7 w-20 mt-0.5" />
                ) : (
                  <span className={cn('text-xl font-semibold tabular-nums', resultado !== null && resultado >= 0 ? 'text-success' : 'text-destructive')}>
                    {resultado !== null ? formatCurrency(resultado) : '—'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Atividade Recente ── */}
      <section className="px-4 md:px-8 mt-8 pb-12 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="text-sm font-medium text-foreground">Atividade recente</h2>
            <button
              onClick={() => navigate('/pedidos')}
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="px-6 pb-5">
            {recentLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum pedido recente</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {recentOrders.map((order) => {
                  const name = order.cliente_nome || 'Cliente';
                  return (
                    <div key={order.pedido_id} className="flex items-center gap-3 py-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-semibold text-muted-foreground">{getInitials(name)}</span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(order.data_criacao), 'dd/MM/yy', { locale: ptBR })}
                        </p>
                      </div>
                      {/* Value + Badge */}
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
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </section>

    </div>
  );
}
