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
        .from('vw_dashboard_financeiro')
        .select('*')
        .gte('data', fromDate)
        .lte('data', toDate)
        .order('data', { ascending: false });

      if (error) throw error;
      return (data || []) as FinanceiroItem[];
    },
  });
}

export function useFinanceiroKPIs() {
  const { data: items, isLoading, error } = useFinanceiroData();

  const kpis: FinanceiroKPIs = {
    receita: 0,
    despesas: 0,
    resultado: 0,
  };

  if (items) {
    // Only count paid items (status = '2')
    const paidItems = items.filter(item => item.status === '2');

    kpis.receita = paidItems
      .filter(item => item.tipo === 'Entrada')
      .reduce((sum, item) => sum + Number(item.valor), 0);

    kpis.despesas = paidItems
      .filter(item => item.tipo === 'Saída')
      .reduce((sum, item) => sum + Number(item.valor), 0);

    kpis.resultado = kpis.receita - kpis.despesas;
  }

  return { kpis, isLoading, error };
}

export function useCategoriasDespesas() {
  const { data: items, isLoading, error } = useFinanceiroData();

  let categorias: CategoriaAgrupada[] = [];

  if (items) {
    // Only paid expenses
    const despesas = items.filter(item => item.tipo === 'Saída' && item.status === '2');
    const total = despesas.reduce((sum, item) => sum + Number(item.valor), 0);

    // Group by category
    const grouped = despesas.reduce((acc, item) => {
      const cat = item.categoria || 'Sem Categoria';
      acc[cat] = (acc[cat] || 0) + Number(item.valor);
      return acc;
    }, {} as Record<string, number>);

    // Convert to array with percentages
    categorias = Object.entries(grouped)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: total > 0 ? (valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);

    // Consolidate small categories (<2%) into "Outros"
    const threshold = 2;
    const mainCats = categorias.filter(c => c.percentual >= threshold);
    const otherCats = categorias.filter(c => c.percentual < threshold);

    if (otherCats.length > 0) {
      const otherTotal = otherCats.reduce((sum, c) => sum + c.valor, 0);
      const otherPct = total > 0 ? (otherTotal / total) * 100 : 0;
      mainCats.push({
        categoria: 'Outros',
        valor: otherTotal,
        percentual: otherPct,
      });
    }

    categorias = mainCats;
  }

  return { categorias, isLoading, error };
}

export function useTransacoesPaginadas(
  page: number = 1,
  pageSize: number = 20,
  filters?: { tipo?: 'all' | 'Entrada' | 'Saída'; categoria?: string }
) {
  const { data: items, isLoading, error } = useFinanceiroData();

  let filteredItems = items || [];

  // Client-side filtering
  if (filters?.tipo && filters.tipo !== 'all') {
    filteredItems = filteredItems.filter(item => item.tipo === filters.tipo);
  }

  if (filters?.categoria && filters.categoria !== 'all') {
    filteredItems = filteredItems.filter(item => item.categoria === filters.categoria);
  }

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const transacoes = filteredItems.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const totalItems = filteredItems.length;

  return { transacoes, totalPages, totalItems, isLoading, error, page };
}