 import { useState, useRef, useCallback, useEffect } from 'react';
 import { motion } from 'framer-motion';
 import { Send, Loader2 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface ChatInputProps {
   onSend: (message: string) => void;
   isLoading: boolean;
   placeholder?: string;
 }
 
 export function ChatInput({ onSend, isLoading, placeholder = 'Digite sua pergunta...' }: ChatInputProps) {
   const [value, setValue] = useState('');
   const textareaRef = useRef<HTMLTextAreaElement>(null);
 
   const adjustHeight = useCallback(() => {
     const textarea = textareaRef.current;
     if (!textarea) return;
     
     textarea.style.height = '24px';
     const newHeight = Math.min(textarea.scrollHeight, 120);
     textarea.style.height = `${newHeight}px`;
   }, []);
 
   useEffect(() => {
     adjustHeight();
   }, [value, adjustHeight]);
 
   const handleSubmit = () => {
     if (value.trim() && !isLoading) {
       onSend(value.trim());
       setValue('');
       if (textareaRef.current) {
         textareaRef.current.style.height = '24px';
       }
     }
   };
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleSubmit();
     }
   };
 
   return (
     <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl p-4">
       <div className="max-w-3xl mx-auto">
         <div className="relative flex items-end gap-2 rounded-2xl border border-border/50 bg-card/50 p-2 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
           <textarea
             ref={textareaRef}
             value={value}
             onChange={(e) => setValue(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder={placeholder}
             disabled={isLoading}
             rows={1}
             className={cn(
               'flex-1 resize-none bg-transparent px-3 py-1.5 text-sm',
               'placeholder:text-muted-foreground/60',
               'focus:outline-none',
               'disabled:cursor-not-allowed disabled:opacity-50',
               'min-h-[24px] max-h-[120px]'
             )}
             style={{ height: '24px' }}
           />
           
           <motion.button
             onClick={handleSubmit}
             disabled={!value.trim() || isLoading}
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             className={cn(
               'flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all',
               value.trim() && !isLoading
                 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                 : 'bg-secondary text-muted-foreground'
             )}
           >
             {isLoading ? (
               <Loader2 className="h-4 w-4 animate-spin" />
             ) : (
               <Send className="h-4 w-4" />
             )}
           </motion.button>
         </div>
         
         <p className="text-[11px] text-muted-foreground/60 text-center mt-2">
           Pergunte sobre financeiro, vendas, pedidos, clientes e mais.
         </p>
       </div>
     </div>
   );
 }