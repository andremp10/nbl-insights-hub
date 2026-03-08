import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDateFilter } from '@/contexts/DateFilterContext';
import { format } from 'date-fns';

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
      const row = Array.isArray(data) ? data[0] : data;
      return {
        receita: Number(row?.receita || 0),
        despesas: Number(row?.despesa || 0),
        resultado: Number(row?.resultado || 0),
      } as FinanceiroKPIs;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    placeholderData: (previousData) => previousData,
  });

  return { kpis: data || { receita: 0, despesas: 0, resultado: 0 }, isLoading, error };
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
      const items = (data || []) as { categoria: string; valor: number }[];
      const total = items.reduce((s, i) => s + Number(i.valor || 0), 0);

      const all = items
        .map(i => ({
          categoria: i.categoria,
          valor: Number(i.valor || 0),
          percentual: total > 0 ? (Number(i.valor || 0) / total) * 100 : 0,
        }))
        .sort((a, b) => b.valor - a.valor);

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
      return main;
    },
  });

  return { categorias: data || [], isLoading, error };
}
