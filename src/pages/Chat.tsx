 import { useRef, useEffect } from 'react';
 import { RotateCcw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
 import { AnimatePresence, motion } from 'framer-motion';
 import { DashboardLayout } from '@/components/layout/DashboardLayout';
 import { Button } from '@/components/ui/button';
 import { ChatMessage } from '@/components/chat/ChatMessage';
 import { ChatInput } from '@/components/chat/ChatInput';
 import { TypingIndicator } from '@/components/chat/TypingIndicator';
 import { useChatbot, SuggestedAction } from '@/hooks/useChatbot';
import { useDateFilter } from '@/contexts/DateFilterContext';
 
export default function Chat() {
  const { messages, isLoading, sendMessage, clearMessages } = useChatbot();
  const { setDateRange, setPreset } = useDateFilter();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

   const handleSend = (message: string) => {
     sendMessage(message);
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
     <DashboardLayout title="Assistente NBL" showDateFilter={false}>
       <div className="flex flex-col h-[calc(100vh-7rem)] -m-6 md:-m-8">
         {/* Header */}
         <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-background/50 backdrop-blur-sm">
           <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
               <Sparkles className="h-4 w-4 text-primary-foreground" />
             </div>
             <div>
               <h2 className="text-sm font-medium text-foreground">Assistente NBL</h2>
               <p className="text-[11px] text-muted-foreground">
                 {isLoading ? 'Pensando...' : 'Online'}
               </p>
             </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
             className="gap-2 text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <RotateCcw className="h-4 w-4" />
             <span className="hidden sm:inline">Limpar conversa</span>
          </Button>
        </div>

         {/* Messages area with gradient background */}
         <div className="flex-1 overflow-y-auto scrollbar-thin">
           <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
             <AnimatePresence mode="popLayout">
               {messages.map((message) => (
                 <ChatMessage
                   key={message.id}
                   message={message}
                   onActionClick={handleActionClick}
                 />
               ))}
               {isLoading && <TypingIndicator key="typing" />}
             </AnimatePresence>
             <div ref={messagesEndRef} />
           </div>
         </div>
 
         {/* Input area */}
         <ChatInput onSend={handleSend} isLoading={isLoading} />
       </div>
     </DashboardLayout>
   );
 }