import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { format } from 'date-fns';
import { getCurrentEtlBucket, getEtlStaleTime, loadFromLocal, saveToLocal } from '@/lib/etlCache';

export interface PedidoItem {
  pedido_id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_email: string | null;
  cliente_telefone: string | null;
  cliente_celular: string | null;
  cliente_tipo: string | null;
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
  const etlBucket = getCurrentEtlBucket();
  const cacheKey = `pedidos:${fromDate}:${toDate}`;

  return useQuery({
    queryKey: ['pedidos', etlBucket, fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_dashboard_pedidos')
        .select('*')
        .gte('data_criacao', fromDate)
        .lte('data_criacao', toDate + 'T23:59:59')
        .order('data_criacao', { ascending: false })
        .limit(1000);

      if (error) throw error;
      const items = (data || []) as PedidoItem[];
      saveToLocal(cacheKey, items);
      return items;
    },
    initialData: () => loadFromLocal<PedidoItem[]>(cacheKey),
    staleTime: getEtlStaleTime(),
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}

export function usePedidosKPIs() {
  const { data: items, isLoading, error } = usePedidosData();

  const kpis = useMemo<PedidosKPIs>(() => {
    const acc: PedidosKPIs = { totalPedidos: 0, faturamento: 0, emProducao: 0, atrasados: 0 };
    if (!items) return acc;
    for (const item of items) {
      acc.totalPedidos += 1;
      acc.faturamento += Number(item.valor_total || 0);
      if (item.status_pedido === 'Em Produção') acc.emProducao += 1;
      if (item.is_atrasado) acc.atrasados += 1;
    }
    return acc;
  }, [items]);

  return { kpis, isLoading, error };
}

export function useStatusDistribuicao() {
  const { data: items, isLoading, error } = usePedidosData();

  const statusData = useMemo<StatusAgrupado[]>(() => {
    if (!items) return [];
    const total = items.length;
    const grouped = items.reduce((acc, item) => {
      const status = item.status_pedido || 'Desconhecido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped)
      .map(([status, quantidade]) => ({
        status,
        quantidade,
        percentual: total > 0 ? (quantidade / total) * 100 : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [items]);

  return { statusData, isLoading, error };
}

export function useTopClientes() {
  const { data: items, isLoading, error } = usePedidosData();

  const clientes = useMemo<ClienteAgrupado[]>(() => {
    if (!items) return [];
    const grouped = items.reduce((acc, item) => {
      const cliente = item.cliente_nome || 'Cliente Desconhecido';
      if (!acc[cliente]) acc[cliente] = { valor: 0, pedidos: 0 };
      acc[cliente].valor += Number(item.valor_total || 0);
      acc[cliente].pedidos += 1;
      return acc;
    }, {} as Record<string, { valor: number; pedidos: number }>);
    return Object.entries(grouped)
      .map(([cliente, data]) => ({ cliente, valor: data.valor, pedidos: data.pedidos }))
      .sort((a, b) => b.valor - a.valor);
  }, [items]);

  return { clientes, isLoading, error };
}

export function usePedidosPaginados(
  page: number = 1,
  pageSize: number = 20,
  filters?: { status?: string }
) {
  const { data: items, isLoading, error } = usePedidosData();

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (filters?.status && filters.status !== 'all') {
      return items.filter(item => item.status_pedido === filters.status);
    }
    return items;
  }, [items, filters?.status]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pedidos = filteredItems.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const totalItems = filteredItems.length;

  return { pedidos, totalPages, totalItems, isLoading, error, page };
}