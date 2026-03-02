import { Package, DollarSign, Factory, AlertTriangle } from 'lucide-react';
import { DateFilterBar } from '@/components/layout/DateFilterBar';
import { KPICard } from '@/components/dashboard/KPICard';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { HorizontalBarChart } from '@/components/dashboard/HorizontalBarChart';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { usePedidosKPIs, useStatusDistribuicao, useTopClientes } from '@/hooks/usePedidos';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function Pedidos() {
  const { kpis, isLoading: kpisLoading } = usePedidosKPIs();
  const { statusData, isLoading: statusLoading } = useStatusDistribuicao();
  const { clientes, isLoading: clientesLoading } = useTopClientes();

  const statusChartData = statusData.map(s => ({ name: s.status, value: s.quantidade }));
  const clientesChartData = clientes.slice(0, 10).map(c => ({ name: c.cliente, value: c.valor }));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-border/50">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Pedidos</h1>
        <DateFilterBar />
      </div>
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <KPICard title="Total de Pedidos" value={kpis.totalPedidos.toString()} subtitle="No período selecionado" icon={<Package className="h-4 w-4" />} variant="default" isLoading={kpisLoading} />
          <KPICard title="Faturamento" value={formatCurrency(kpis.faturamento)} subtitle="Valor total dos pedidos" icon={<DollarSign className="h-4 w-4" />} variant="success" isLoading={kpisLoading} />
          <KPICard title="Em Produção" value={kpis.emProducao.toString()} subtitle="Pedidos ativos" icon={<Factory className="h-4 w-4" />} variant="info" isLoading={kpisLoading} />
          <KPICard title="Atrasados" value={kpis.atrasados.toString()} subtitle="Necessitam atenção" icon={<AlertTriangle className="h-4 w-4" />} variant={kpis.atrasados > 0 ? 'warning' : 'default'} isLoading={kpisLoading} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DonutChart title="Status dos Pedidos" data={statusChartData} isLoading={statusLoading} />
          <HorizontalBarChart title="Top 10 Clientes" data={clientesChartData} isLoading={clientesLoading} color="hsl(142, 71%, 45%)" />
        </div>
        <OrdersTable />
      </div>
    </div>
  );
}
