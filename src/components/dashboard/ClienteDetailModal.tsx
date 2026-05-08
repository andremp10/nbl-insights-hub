import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, Phone, Smartphone, User, ShoppingBag, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PedidoDetailModal } from './PedidoDetailModal';
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

function getStatusDot(status: string, isAtrasado: boolean) {
  if (isAtrasado) return 'bg-destructive';
  const colors: Record<string, string> = {
    'Em Análise': 'bg-warning',
    'Em Produção': 'bg-info',
    'Enviado': 'bg-primary',
    'Finalizado': 'bg-success',
    'Problema no Arquivo': 'bg-destructive',
  };
  return colors[status] || 'bg-muted-foreground';
}

export function ClienteDetailModal({ open, onOpenChange, cliente, pedidosDoCliente }: ClienteDetailModalProps) {
  const [selectedPedido, setSelectedPedido] = useState<PedidoItem | null>(null);

  if (!cliente) return null;

  const totalGasto = pedidosDoCliente.reduce((sum, p) => sum + Number(p.valor_total || 0), 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
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

            {/* Orders list */}
            {pedidosDoCliente.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pedidos ({pedidosDoCliente.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {pedidosDoCliente.map((p) => (
                    <button
                      key={p.pedido_id}
                      onClick={() => setSelectedPedido(p)}
                      className="w-full flex items-center justify-between gap-2 p-2.5 rounded-md border border-border bg-card hover:bg-secondary/50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('h-2 w-2 rounded-full shrink-0', getStatusDot(p.status_pedido, p.is_atrasado))} />
                        <div className="min-w-0">
                          <p className="text-xs text-foreground truncate">
                            {format(new Date(p.data_criacao), 'dd/MM/yy', { locale: ptBR })} — {p.qtde_itens} itens
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.is_atrasado ? 'Atrasado' : p.status_pedido}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-medium text-foreground">{formatCurrency(p.valor_total)}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PedidoDetailModal
        open={!!selectedPedido}
        onOpenChange={(open) => { if (!open) setSelectedPedido(null); }}
        pedido={selectedPedido}
      />
    </>
  );
}
