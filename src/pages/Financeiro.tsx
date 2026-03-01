import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { DateFilterBar } from '@/components/layout/DateFilterBar';
import { KPICard } from '@/components/dashboard/KPICard';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { HorizontalBarChart } from '@/components/dashboard/HorizontalBarChart';
import { useFinanceiroKPIs, useCategoriasDespesas } from '@/hooks/useFinanceiro';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function Financeiro() {
  const { kpis, isLoading: kpisLoading } = useFinanceiroKPIs();
  const { categorias, isLoading: categoriasLoading } = useCategoriasDespesas();

  const donutData = categorias.map(c => ({ name: c.categoria, value: c.valor, percentual: c.percentual }));
  const barData = categorias.map(c => ({ name: c.categoria, value: c.valor }));

  return (
    <div className="dark min-h-screen bg-background">
      <AppHeader />
      <main className="pt-14">
        <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-border/50">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Financeiro</h1>
          <DateFilterBar />
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <KPICard title="Receita Total" value={formatCurrency(kpis.receita)} subtitle="Entradas pagas no período" icon={<TrendingUp className="h-4 w-4" />} variant="success" isLoading={kpisLoading} />
            <KPICard title="Despesas Totais" value={formatCurrency(kpis.despesas)} subtitle="Saídas pagas no período" icon={<TrendingDown className="h-4 w-4" />} variant="destructive" isLoading={kpisLoading} />
            <KPICard title="Resultado Líquido" value={formatCurrency(kpis.resultado)} subtitle="Receita - Despesas" icon={<DollarSign className="h-4 w-4" />} variant={kpis.resultado >= 0 ? 'success' : 'destructive'} isLoading={kpisLoading} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DonutChart title="Composição de Custos" data={donutData} isLoading={categoriasLoading} />
            <HorizontalBarChart title="Top Categorias de Despesas" data={barData} isLoading={categoriasLoading} color="hsl(0, 84%, 60%)" />
          </div>
        </div>
      </main>
    </div>
  );
}
