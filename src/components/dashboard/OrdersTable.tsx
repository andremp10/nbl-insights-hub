import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter, Package } from 'lucide-react';
import { usePedidosPaginados } from '@/hooks/usePedidos';
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

function getStatusBadge(status: string, isAtrasado: boolean) {
  if (isAtrasado) {
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Atrasado</Badge>;
  }

  const statusColors: Record<string, string> = {
    'Em Análise': 'bg-warning/10 text-warning border-warning/30',
    'Em Produção': 'bg-info/10 text-info border-info/30',
    'Enviado': 'bg-primary/10 text-primary border-primary/30',
    'Finalizado': 'bg-success/10 text-success border-success/30',
    'Problema no Arquivo': 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <Badge variant="outline" className={cn(statusColors[status] || 'bg-muted text-muted-foreground')}>
      {status}
    </Badge>
  );
}

export function OrdersTable() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { pedidos, totalPages, totalItems, isLoading } = usePedidosPaginados(page, 20, {
    status: statusFilter
  });

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base flex items-center gap-2">
            Pedidos Recentes
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {totalItems} pedidos encontrados
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="Em Análise">Em Análise</SelectItem>
              <SelectItem value="Em Produção">Em Produção</SelectItem>
              <SelectItem value="Enviado">Enviado</SelectItem>
              <SelectItem value="Finalizado">Finalizado</SelectItem>
              <SelectItem value="Problema no Arquivo">Problema no Arquivo</SelectItem>
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
        ) : pedidos.length === 0 ? (
          <div className="py-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum pedido encontrado no período</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Ajuste o filtro de datas ou status.</p>
          </div>
        ) : (
          <>
            {/* Mobile view */}
            <div className="md:hidden space-y-3">
              {pedidos.map((item) => (
                <div
                  key={item.pedido_id}
                  className="p-3 rounded-lg border border-border bg-secondary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.cliente_nome || 'Cliente não identificado'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.qtde_itens} itens • {format(new Date(item.data_criacao), 'dd/MM/yy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(item.valor_total)}
                      </p>
                      <div className="mt-1">
                        {getStatusBadge(item.status_pedido, item.is_atrasado)}
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
                      Cliente
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Itens
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
                  {pedidos.map((item) => (
                    <tr key={item.pedido_id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {format(new Date(item.data_criacao), 'dd/MM/yy', { locale: ptBR })}
                      </td>
                      <td className="py-3 px-2 text-sm text-foreground max-w-[200px] truncate">
                        {item.cliente_nome || 'Cliente não identificado'}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground text-center">
                        {item.qtde_itens}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {getStatusBadge(item.status_pedido, item.is_atrasado)}
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-right text-foreground">
                        {formatCurrency(item.valor_total)}
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