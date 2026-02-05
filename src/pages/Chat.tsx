import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
 import { DashboardLayout } from '@/components/layout/DashboardLayout';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
 import { cn } from '@/lib/utils';
import { useChatbot, Message, ChatHighlight, SuggestedAction } from '@/hooks/useChatbot';
import { useDateFilter } from '@/contexts/DateFilterContext';
 
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
 }
 
function HighlightCard({ highlight }: { highlight: ChatHighlight }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
      <span className="text-xs text-muted-foreground">{highlight.label}</span>
      <span className="text-sm font-bold text-primary">{formatCurrency(highlight.value)}</span>
    </div>
  );
}
 
function ActionButton({ action, onClick }: { action: SuggestedAction; onClick: () => void }) {
  const labels: Record<string, string> = {
    'set_date_range': `Ver período`,
    'open_module': action.module === 'financeiro' ? 'Ir para Financeiro' : action.module === 'pedidos' ? 'Ir para Pedidos' : 'Abrir módulo',
  };
 
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-xs"
      onClick={onClick}
    >
      <ExternalLink className="h-3 w-3" />
      {labels[action.type] || 'Ação'}
    </Button>
  );
}
 
function MessageBubble({ 
  message, 
  onActionClick 
}: { 
  message: Message; 
  onActionClick: (action: SuggestedAction) => void;
}) {
  const isUser = message.role === 'user';
 
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <Card
        className={cn(
          'max-w-[85%] md:max-w-[70%] p-4 border-border',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-card-foreground'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {/* Highlights */}
        {message.highlights && message.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.highlights.map((h, i) => (
              <HighlightCard key={i} highlight={h} />
            ))}
          </div>
        )}
        
        {/* Suggested actions */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            {message.suggestedActions.map((action, i) => (
              <ActionButton
                key={i}
                action={action}
                onClick={() => onActionClick(action)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function Chat() {
  const { messages, isLoading, sendMessage, clearMessages } = useChatbot();
  const { setDateRange, setPreset } = useDateFilter();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleSend();
     }
   };
 
  const handleActionClick = (action: SuggestedAction) => {
    if (action.type === 'set_date_range' && action.from && action.to) {
      setDateRange({
        from: new Date(action.from),
        to: new Date(action.to),
      });
    } else if (action.type === 'open_module' && action.module) {
      navigate(`/${action.module}`);
    }
  };

   return (
     <DashboardLayout title="Chat NLQ" showDateFilter={false}>
       <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header with clear button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {messages.length - 1} mensagens
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </Button>
        </div>

         {/* Messages area */}
         <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-thin">
           {messages.map((message) => (
            <MessageBubble
               key={message.id}
              message={message}
              onActionClick={handleActionClick}
            />
           ))}
           {isLoading && (
             <div className="flex justify-start">
               <Card className="bg-card border-border p-4">
                 <div className="flex space-x-2">
                   <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                   <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                   <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                 </div>
               </Card>
             </div>
           )}
          <div ref={messagesEndRef} />
         </div>
 
         {/* Input area */}
         <div className="border-t border-border pt-4">
           <div className="flex gap-2">
             <Input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Digite sua pergunta..."
               className="flex-1 bg-secondary/50 border-border"
               disabled={isLoading}
             />
             <Button
               onClick={handleSend}
               disabled={!input.trim() || isLoading}
               size="icon"
             >
               <Send className="h-4 w-4" />
             </Button>
           </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Pergunte sobre financeiro, vendas, pedidos, clientes e mais.
          </p>
         </div>
       </div>
     </DashboardLayout>
   );
 }