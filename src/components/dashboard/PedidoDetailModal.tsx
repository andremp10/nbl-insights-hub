import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Package, Truck, AlertTriangle, User, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PedidoItem } from '@/hooks/usePedidos';

interface PedidoDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: PedidoItem | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

export function PedidoDetailModal({ open, onOpenChange, pedido }: PedidoDetailModalProps) {
  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Detalhes do Pedido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status + Date */}
          <div className="flex items-center justify-between">
            {getStatusBadge(pedido.status_pedido, pedido.is_atrasado)}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(new Date(pedido.data_criacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          {/* Delay warning */}
          {pedido.is_atrasado && pedido.dias_em_atraso > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                Pedido atrasado há <span className="font-semibold">{pedido.dias_em_atraso} dias</span>
              </p>
            </div>
          )}

          {/* Values */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Total</span>
              <span className="font-semibold text-foreground">{formatCurrency(pedido.valor_total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3" /> Frete
              </span>
              <span className="text-foreground">{formatCurrency(pedido.frete_valor)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" /> Itens
              </span>
              <span className="text-foreground">{pedido.qtde_itens}</span>
            </div>
          </div>

          {/* Client info */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-3.5 w-3.5" />
              Cliente
            </div>
            <p className="text-sm text-foreground">{pedido.cliente_nome || 'Não identificado'}</p>
            {pedido.cliente_email && (
              <p className="text-xs text-muted-foreground">{pedido.cliente_email}</p>
            )}
            {pedido.cliente_telefone && (
              <p className="text-xs text-muted-foreground">{pedido.cliente_telefone}</p>
            )}
            {pedido.cliente_tipo && (
              <Badge variant="outline" className="text-xs mt-1">
                {pedido.cliente_tipo === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </Badge>
            )}
          </div>

          {/* ID */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
            <Clock className="h-3 w-3" />
            ID: {pedido.pedido_id.substring(0, 8)}...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
