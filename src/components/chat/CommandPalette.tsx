 import { motion } from 'framer-motion';
 import { DollarSign, Package, TrendingUp, TrendingDown } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 export interface CommandSuggestion {
   icon: React.ReactNode;
   label: string;
   description: string;
   prefix: string;
 }
 
 export const nblCommands: CommandSuggestion[] = [
   {
     icon: <DollarSign className="w-4 h-4" />,
     label: 'Financeiro',
     description: 'Ver dashboard financeiro',
     prefix: '/financeiro',
   },
   {
     icon: <Package className="w-4 h-4" />,
     label: 'Pedidos',
     description: 'Ver status de pedidos',
     prefix: '/pedidos',
   },
   {
     icon: <TrendingUp className="w-4 h-4" />,
     label: 'Receita',
     description: 'Consultar receitas do período',
     prefix: '/receita',
   },
   {
     icon: <TrendingDown className="w-4 h-4" />,
     label: 'Despesas',
     description: 'Consultar despesas do período',
     prefix: '/despesas',
   },
 ];
 
 interface CommandPaletteProps {
   activeSuggestion: number;
   onSelect: (index: number) => void;
   inputValue: string;
 }
 
 export function CommandPalette({
   activeSuggestion,
   onSelect,
   inputValue,
 }: CommandPaletteProps) {
   const filteredCommands = nblCommands.filter((cmd) =>
     cmd.prefix.toLowerCase().startsWith(inputValue.toLowerCase())
   );
 
   if (filteredCommands.length === 0) return null;
 
   return (
     <motion.div
       initial={{ opacity: 0, y: 8 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: 8 }}
       transition={{ duration: 0.15 }}
       className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl z-50"
     >
       <div className="space-y-1">
         {filteredCommands.map((suggestion, index) => {
           const originalIndex = nblCommands.findIndex(
             (cmd) => cmd.prefix === suggestion.prefix
           );
           return (
             <motion.div
               key={suggestion.prefix}
               onClick={() => onSelect(originalIndex)}
               className={cn(
                 'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
                 activeSuggestion === originalIndex
                   ? 'bg-primary/20 text-primary'
                   : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
               )}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: index * 0.03 }}
             >
               <div
                 className={cn(
                   'p-1.5 rounded-md',
                   activeSuggestion === originalIndex
                     ? 'bg-primary/20 text-primary'
                     : 'bg-muted/50'
                 )}
               >
                 {suggestion.icon}
               </div>
               <div className="flex-1">
                 <p className="text-sm font-medium">{suggestion.label}</p>
                 <p className="text-xs text-muted-foreground">
                   {suggestion.description}
                 </p>
               </div>
               <span className="text-xs text-muted-foreground/60 font-mono">
                 {suggestion.prefix}
               </span>
             </motion.div>
           );
         })}
       </div>
       <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-4 text-[10px] text-muted-foreground/50">
         <span>
           <kbd className="px-1 py-0.5 rounded bg-muted/50">↑↓</kbd> navegar
         </span>
         <span>
           <kbd className="px-1 py-0.5 rounded bg-muted/50">Tab</kbd> selecionar
         </span>
         <span>
           <kbd className="px-1 py-0.5 rounded bg-muted/50">Esc</kbd> fechar
         </span>
       </div>
     </motion.div>
   );
 }