import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { format } from 'date-fns';

export interface FinanceiroItem {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: 'Entrada' | 'Saída';
  categoria: string;
  categoria_id: string;
  status: string;
}

export interface FinanceiroKPIs {
  receita: number;
  despesas: number;
  resultado: number;
}

export interface CategoriaAgrupada {
  categoria: string;
  valor: number;
  percentual: number;
}

// Single data source: vw_dashboard_financeiro
function useFinanceiroData() {
  const { dateRange } = useDateFilter();
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['financeiro', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_dashboard_financeiro')
        .select('*')
        .gte('data', fromDate)
        .lte('data', toDate)
        .neq('categoria_id', 'c38d3ba0-9976-5510-8d71-d85405ed9b64')
        .order('data', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as FinanceiroItem[];
    },
  });
}

export function useFinanceiroKPIs() {
  const { data: items, isLoading, error } = useFinanceiroData();

  const kpis: FinanceiroKPIs = { receita: 0, despesas: 0, resultado: 0 };

  if (items) {
    kpis.receita = items
      .filter(i => i.tipo === 'Entrada')
      .reduce((sum, i) => sum + Number(i.valor || 0), 0);
    kpis.despesas = items
      .filter(i => i.tipo === 'Saída')
      .reduce((sum, i) => sum + Number(i.valor || 0), 0);
    kpis.resultado = kpis.receita - kpis.despesas;
  }

  return { kpis, isLoading, error };
}

export function useCategoriasDespesas() {
  const { data: items, isLoading, error } = useFinanceiroData();

  let categorias: CategoriaAgrupada[] = [];

  if (items) {
    const despesas = items.filter(i => i.tipo === 'Saída');
    const grouped = despesas.reduce((acc, item) => {
      const cat = item.categoria || 'Sem Categoria';
      acc[cat] = (acc[cat] || 0) + Number(item.valor || 0);
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(grouped).reduce((s, v) => s + v, 0);

    const all = Object.entries(grouped)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: total > 0 ? (valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);

    // Group small categories (<2%) into "Outros"
    const main = all.filter(c => c.percentual >= 2);
    const others = all.filter(c => c.percentual < 2);
    if (others.length > 0) {
      const otherTotal = others.reduce((s, c) => s + c.valor, 0);
      main.push({
        categoria: 'Outros',
        valor: otherTotal,
        percentual: total > 0 ? (otherTotal / total) * 100 : 0,
      });
    }
    categorias = main;
  }

  return { categorias, isLoading, error };
}

export function useTransacoesPaginadas(
  page: number = 1,
  pageSize: number = 20,
  filters?: { tipo?: 'all' | 'Entrada' | 'Saída'; categoria?: string }
) {
  const { dateRange } = useDateFilter();
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['financeiro-transacoes', fromDate, toDate, page, pageSize, filters],
    queryFn: async () => {
      let query = supabase
        .from('vw_dashboard_financeiro')
        .select('*', { count: 'exact' })
        .gte('data', fromDate)
        .lte('data', toDate)
        .neq('categoria_id', 'c38d3ba0-9976-5510-8d71-d85405ed9b64');

      if (filters?.tipo && filters.tipo !== 'all') {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.categoria && filters.categoria !== 'all') {
        query = query.eq('categoria', filters.categoria);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('data', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        transacoes: (data || []) as unknown as FinanceiroItem[],
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        page,
      };
    },
    placeholderData: (previousData) => previousData,
  });
}
