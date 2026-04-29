import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentEtlBucket, getEtlStaleTime, loadFromLocal, saveToLocal } from '@/lib/etlCache';

interface HomeKpis {
  totalPedidos: number;
  atrasados: number;
  resultado: number;
}

interface RecentOrder {
  pedido_id: string;
  cliente_nome: string | null;
  data_criacao: string;
  valor_total: number;
  status_pedido: string;
  is_atrasado: boolean;
}

function getMonthRange() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  return { startOfMonth, endOfMonth };
}

export function useHomeKPIs() {
  const { startOfMonth, endOfMonth } = getMonthRange();
  const etlBucket = getCurrentEtlBucket();
  const cacheKey = `home-kpis:${startOfMonth}:${endOfMonth}`;

  return useQuery({
    queryKey: ['home-kpis', etlBucket, startOfMonth, endOfMonth],
    queryFn: async (): Promise<HomeKpis> => {
      const [finRes, pedRes, atrasRes] = await Promise.all([
        supabase.rpc('get_financeiro_kpis', { p_data_inicio: startOfMonth, p_data_fim: endOfMonth }),
        supabase.from('vw_dashboard_pedidos').select('pedido_id', { count: 'exact', head: true })
          .gte('data_criacao', startOfMonth)
          .lte('data_criacao', endOfMonth + 'T23:59:59'),
        supabase.from('vw_dashboard_pedidos').select('pedido_id', { count: 'exact', head: true })
          .eq('is_atrasado', true),
      ]);

      const finRow = Array.isArray(finRes.data) ? finRes.data[0] : finRes.data;
      const receita = Number(finRow?.receita || 0);
      const despesa = Number(finRow?.despesa || 0);

      const result: HomeKpis = {
        totalPedidos: pedRes.count ?? 0,
        atrasados: atrasRes.count ?? 0,
        resultado: receita - despesa,
      };
      saveToLocal(cacheKey, result);
      return result;
    },
    initialData: () => loadFromLocal<HomeKpis>(cacheKey),
    staleTime: getEtlStaleTime(),
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
  });
}

export function useRecentOrders() {
  const etlBucket = getCurrentEtlBucket();
  const cacheKey = 'home-recent-orders';

  return useQuery({
    queryKey: ['home-recent-orders', etlBucket],
    queryFn: async (): Promise<RecentOrder[]> => {
      const { data, error } = await supabase
        .from('vw_dashboard_pedidos')
        .select('pedido_id, cliente_nome, data_criacao, valor_total, status_pedido, is_atrasado')
        .order('data_criacao', { ascending: false })
        .limit(4);

      if (error) throw error;
      const items = (data || []) as RecentOrder[];
      saveToLocal(cacheKey, items);
      return items;
    },
    initialData: () => loadFromLocal<RecentOrder[]>(cacheKey),
    staleTime: getEtlStaleTime(),
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
  });
}
