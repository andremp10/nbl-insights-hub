import { Mail, Phone, Smartphone, User, ShoppingBag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { PedidoItem } from '@/hooks/usePedidos';

interface ClienteDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: PedidoItem | null;
  pedidosDoCliente: PedidoItem[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function ClienteDetailModal({ open, onOpenChange, cliente, pedidosDoCliente }: ClienteDetailModalProps) {
  if (!cliente) return null;

  const totalGasto = pedidosDoCliente.reduce((sum, p) => sum + Number(p.valor_total || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Detalhes do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <p className="text-sm font-medium text-foreground">
              {cliente.cliente_nome || 'Cliente não identificado'}
            </p>
            {cliente.cliente_tipo && (
              <Badge variant="outline" className="mt-1 text-xs">
                {cliente.cliente_tipo === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </Badge>
            )}
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            {cliente.cliente_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{cliente.cliente_email}</span>
              </div>
            )}
            {cliente.cliente_telefone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{cliente.cliente_telefone}</span>
              </div>
            )}
            {cliente.cliente_celular && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                <span>{cliente.cliente_celular}</span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
              Resumo no período
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pedidos</span>
              <span className="font-medium text-foreground">{pedidosDoCliente.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total gasto</span>
              <span className="font-medium text-foreground">{formatCurrency(totalGasto)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
