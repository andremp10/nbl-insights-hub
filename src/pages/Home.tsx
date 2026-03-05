import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, TrendingUp, ShoppingBag, ArrowRight, Users, Bot, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Bom dia', emoji: '☀️' };
  if (h >= 12 && h < 18) return { text: 'Boa tarde', emoji: '🌤️' };
  return { text: 'Boa noite', emoji: '🌙' };
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

// Animated counter hook
function useCountUp(target: number | null, duration = 1200): number | null {
  const [value, setValue] = useState<number | null>(null);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    if (target === null) { setValue(null); return; }
    if (target === 0) { setValue(0); return; }

    const start = performance.now();
    startRef.current = start;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

interface KpiData {
  pedidosHoje: number | null;
  faturamentoMes: number | null;
  pendentes: number | null;
  clientesAtivos: number | null;
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const modules = [
  {
    title: 'Assistente IA',
    description: 'Consulte dados em linguagem natural. Pergunte sobre pedidos, clientes e financeiro.',
    icon: Bot,
    route: '/chat',
    gradient: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    title: 'Financeiro',
    description: 'Receitas, despesas, DRE e fluxo de caixa com gráficos interativos.',
    icon: TrendingUp,
    route: '/financeiro',
    gradient: 'from-green-500/20 to-green-500/5',
    iconColor: 'text-green-500',
  },
  {
    title: 'Pedidos',
    description: 'Acompanhe status, clientes top e faturamento por período.',
    icon: ShoppingBag,
    route: '/pedidos',
    gradient: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-500',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [kpis, setKpis] = useState<KpiData>({ pedidosHoje: null, faturamentoMes: null, pendentes: null, clientesAtivos: null });
  const [kpisLoading, setKpisLoading] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  const greeting = useMemo(getGreeting, []);

  const pedidosAnimated = useCountUp(kpis.pedidosHoje);
  const faturamentoAnimated = useCountUp(kpis.faturamentoMes);
  const pendentesAnimated = useCountUp(kpis.pendentes);
  const clientesAnimated = useCountUp(kpis.clientesAtivos);

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
    { label: 'Pedidos hoje', value: pedidosAnimated, format: (v: number) => v.toString(), icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Faturamento mês', value: faturamentoAnimated, format: formatCurrency, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Pendentes', value: pendentesAnimated, format: (v: number) => v.toString(), icon: Sparkles, color: 'text-amber-400' },
    { label: 'Clientes ativos', value: clientesAnimated, format: (v: number) => v.toString(), icon: Users, color: 'text-violet-400' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-4 md:px-8 py-16 md:py-24">
        <motion.div variants={stagger} initial="hidden" animate="visible">

          {/* Hero */}
          <motion.section variants={fadeUp} className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
              {greeting.text} {greeting.emoji}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Plataforma de gestão inteligente da <span className="text-primary font-semibold">NBL Gráfica</span>
            </p>
          </motion.section>

          {/* Search bar */}
          <motion.section variants={fadeUp} className="mb-14">
            <div
              className={cn(
                'relative max-w-xl mx-auto rounded-2xl border transition-all duration-300',
                inputFocused
                  ? 'border-primary/60 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)]'
                  : 'border-border'
              )}
            >
              <div className="absolute inset-0 rounded-2xl bg-card/80 backdrop-blur-sm pointer-events-none" />
              <div className="relative flex items-center">
                <MessageSquare className="absolute left-4 w-5 h-5 text-muted-foreground/50" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickQuery(query); } }}
                  placeholder="Pergunte algo ao assistente..."
                  className="w-full bg-transparent py-4 pl-12 pr-14 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none rounded-2xl"
                />
                <button
                  onClick={() => handleQuickQuery(query)}
                  disabled={!query.trim()}
                  aria-label="Enviar consulta"
                  className="absolute right-3 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.section>

          {/* Module cards */}
          <motion.section variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <motion.div
                  key={mod.title}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(mod.route)}
                  className="group relative bg-card border border-border rounded-2xl p-6 cursor-pointer overflow-hidden transition-colors duration-200 hover:border-primary/40"
                >
                  <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300', mod.gradient)} />
                  <div className="relative">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-muted/50 group-hover:bg-muted transition-colors', mod.iconColor)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.section>

          {/* KPIs */}
          <motion.section variants={fadeUp}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 text-center font-medium">
              Resumo do dia
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpiCards.map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className="bg-card/50 border border-border/50 rounded-xl p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Icon className={cn('w-3.5 h-3.5', k.color)} />
                      <span className="text-[10px] uppercase text-muted-foreground/60 tracking-wide">{k.label}</span>
                    </div>
                    {kpisLoading ? (
                      <Skeleton className="h-7 w-20 mx-auto" />
                    ) : (
                      <p className="text-xl font-bold text-foreground tabular-nums">
                        {k.value !== null ? k.format(k.value) : '—'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>

        </motion.div>
      </div>
    </div>
  );
}
