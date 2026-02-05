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

export function useFinanceiroData() {
  const { dateRange } = useDateFilter();

  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['financeiro', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_financeiro_analitico') // Updated view
        .select('*')
        .gte('data', fromDate)
        .lte('data', toDate)
        // Exclude specific category as per legacy logic (Internal Transfer/Adjustment)
        .neq('categoria_id', 'c38d3ba0-9976-5510-8d71-d85405ed9b64')
        .order('data', { ascending: false });

      if (error) throw error;
      return (data || []) as FinanceiroItem[];
    },
  });
}

export function useFinanceiroKPIs() {
  const { dateRange } = useDateFilter();
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  const { data, isLoading, error } = useQuery({
    queryKey: ['financeiro-kpis', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financeiro_kpis', {
        p_data_inicio: fromDate,
        p_data_fim: toDate,
      });

      if (error) throw error;

      const result = data?.[0] || { receita: 0, despesa: 0, resultado: 0 };

      return {
        receita: Number(result.receita || 0),
        despesas: Number(result.despesa || 0),
        resultado: Number(result.resultado || 0),
      } as FinanceiroKPIs;
    },
  });

  return {
    kpis: data || { receita: 0, despesas: 0, resultado: 0 },
    isLoading,
    error
  };
}

export function useCategoriasDespesas() {
  const { dateRange } = useDateFilter();
  const fromDate = format(dateRange.from, 'yyyy-MM-dd');
  const toDate = format(dateRange.to, 'yyyy-MM-dd');

  const { data, isLoading, error } = useQuery({
    queryKey: ['financeiro-graficos', fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financeiro_graficos', {
        p_data_inicio: fromDate,
        p_data_fim: toDate,
      });

      if (error) throw error;

      const rawData = data || [];
      const total = rawData.reduce((sum, item) => sum + Number(item.valor), 0);

      const result = rawData.map((item: any) => ({
        categoria: item.categoria,
        valor: Number(item.valor),
        percentual: total > 0 ? (Number(item.valor) / total) * 100 : 0,
      }));

      // Group small categories
      const threshold = 2;
      const mainCats = result.filter(c => c.percentual >= threshold);
      const otherCats = result.filter(c => c.percentual < threshold);

      if (otherCats.length > 0) {
        const otherTotal = otherCats.reduce((sum, c) => sum + c.valor, 0);
        const otherPct = total > 0 ? (otherTotal / total) * 100 : 0;
        mainCats.push({
          categoria: 'Outros',
          valor: otherTotal,
          percentual: otherPct,
        });
      }

      return mainCats as CategoriaAgrupada[];
    },
  });

  return { categorias: data || [], isLoading, error };
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
        .from('vw_financeiro_analitico')
        .select('*', { count: 'exact' })
        .gte('data', fromDate)
        .lte('data', toDate)
        .neq('categoria_id', 'c38d3ba0-9976-5510-8d71-d85405ed9b64'); // Legacy exclusion

      if (filters?.tipo && filters.tipo !== 'all') {
        // Map 'Entrada'/'Saída' to existing logic if needed, or view handles it.
        // View has 'tipo' as 'Entrada'/'Saída' text now.
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
        transacoes: (data || []) as FinanceiroItem[],
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        page
      };
    },
    // Keep previous data while fetching new page for smoother transition
    placeholderData: (previousData) => previousData,
  });
}