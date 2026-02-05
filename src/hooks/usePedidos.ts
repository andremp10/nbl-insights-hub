import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { format } from 'date-fns';

export interface PedidoItem {
  pedido_id: string;
  cliente_id: string;
  cliente_nome: string;
  data_criacao: string;
  status_pedido: string;
  qtde_itens: number;
  valor_total: number;
  frete_valor: number;
  is_finalizado: boolean;
  is_atrasado: boolean;
  dias_em_atraso: number;
}

export interface PedidosKPIs {
  totalPedidos: number;
  faturamento: number;
  emProducao: number;
  atrasados: number;
}

export interface StatusAgrupado {
  status: string;
  quantidade: number;
  percentual: number;
}

export interface ClienteAgrupado {
  cliente: string;
  valor: number;
  pedidos: number;
}

export function usePedidosData() {
  const { dateRange } = useDateFilter();

  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['pedidos', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_dashboard_pedidos')
        .select('*')
        .gte('data_criacao', fromDate)
        .lte('data_criacao', toDate + 'T23:59:59')
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      return (data || []) as PedidoItem[];
    },
  });
}

export function usePedidosKPIs() {
  const { data: items, isLoading, error } = usePedidosData();

  const kpis: PedidosKPIs = {
    totalPedidos: 0,
    faturamento: 0,
    emProducao: 0,
    atrasados: 0,
  };

  if (items) {
    kpis.totalPedidos = items.length;
    kpis.faturamento = items.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);
    kpis.emProducao = items.filter(item => item.status_pedido === 'Em Produção').length;
    kpis.atrasados = items.filter(item => item.is_atrasado).length;
  }

  return { kpis, isLoading, error };
}

export function useStatusDistribuicao() {
  const { data: items, isLoading, error } = usePedidosData();

  let statusData: StatusAgrupado[] = [];

  if (items) {
    const total = items.length;

    // Group by status
    const grouped = items.reduce((acc, item) => {
      const status = item.status_pedido || 'Desconhecido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    statusData = Object.entries(grouped)
      .map(([status, quantidade]) => ({
        status,
        quantidade,
        percentual: total > 0 ? (quantidade / total) * 100 : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }

  return { statusData, isLoading, error };
}

export function useTopClientes() {
  const { data: items, isLoading, error } = usePedidosData();

  let clientes: ClienteAgrupado[] = [];

  if (items) {
    // Group by cliente
    const grouped = items.reduce((acc, item) => {
      const cliente = item.cliente_nome || 'Cliente Desconhecido';
      if (!acc[cliente]) {
        acc[cliente] = { valor: 0, pedidos: 0 };
      }
      acc[cliente].valor += Number(item.valor_total || 0);
      acc[cliente].pedidos += 1;
      return acc;
    }, {} as Record<string, { valor: number; pedidos: number }>);

    clientes = Object.entries(grouped)
      .map(([cliente, data]) => ({
        cliente,
        valor: data.valor,
        pedidos: data.pedidos,
      }))
      .sort((a, b) => b.valor - a.valor);
  }

  return { clientes, isLoading, error };
}

export function usePedidosPaginados(
  page: number = 1,
  pageSize: number = 20,
  filters?: { status?: string }
) {
  const { data: items, isLoading, error } = usePedidosData();

  let filteredItems = items || [];

  // Client-side filtering
  if (filters?.status && filters.status !== 'all') {
    filteredItems = filteredItems.filter(item => item.status_pedido === filters.status);
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const pedidos = filteredItems.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const totalItems = filteredItems.length;

  return { pedidos, totalPages, totalItems, isLoading, error, page };
}