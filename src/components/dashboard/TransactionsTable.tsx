import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useTransacoesPaginadas, FinanceiroItem, useCategoriasDespesas } from '@/hooks/useFinanceiro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getStatusBadge(status: string) {
  switch (status) {
    case '2':
      return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Pago</Badge>;
    case '1':
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Pendente</Badge>;
    case '0':
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Cancelado</Badge>;
    default:
      return <Badge variant="outline">--</Badge>;
  }
}

export function TransactionsTable() {
  const [page, setPage] = useState(1);
  const [tipoFilter, setTipoFilter] = useState<'all' | 'Entrada' | 'Saída'>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');

  const { data: queryData, isLoading } = useTransacoesPaginadas(page, 20, {
    tipo: tipoFilter,
    categoria: categoriaFilter
  });

  const transacoes = queryData?.transacoes || [];
  const totalPages = queryData?.totalPages || 1;
  const totalItems = queryData?.totalItems || 0;

  const { categorias } = useCategoriasDespesas();

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Transações</CardTitle>
          <span className="text-sm text-muted-foreground">
            {totalItems} registros encontrados
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />

          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v as any); setPage(1); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="Entrada">Entradas</SelectItem>
              <SelectItem value="Saída">Saídas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoriaFilter} onValueChange={(v) => { setCategoriaFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categorias.map(c => (
                <SelectItem key={c.categoria} value={c.categoria}>
                  {c.categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : transacoes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma transação no período</p>
          </div>
        ) : (
          <>
            {/* Mobile view */}
            <div className="md:hidden space-y-3">
              {transacoes.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-border bg-secondary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.descricao || 'Sem descrição'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.categoria} • {format(new Date(item.data), 'dd/MM/yy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-semibold',
                        item.tipo === 'Entrada' ? 'text-success' : 'text-destructive'
                      )}>
                        {item.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(item.valor)}
                      </p>
                      <div className="mt-1">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {format(new Date(item.data), 'dd/MM/yy', { locale: ptBR })}
                      </td>
                      <td className="py-3 px-2 text-sm text-foreground max-w-[200px] truncate">
                        {item.descricao || 'Sem descrição'}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {item.categoria}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className={cn(
                        'py-3 px-2 text-sm font-medium text-right',
                        item.tipo === 'Entrada' ? 'text-success' : 'text-destructive'
                      )}>
                        {item.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(item.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}