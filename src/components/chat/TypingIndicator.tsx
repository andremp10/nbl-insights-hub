 import { motion } from 'framer-motion';
 import { Sparkles } from 'lucide-react';
 
 export function TypingIndicator() {
   return (
     <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -10 }}
       className="flex gap-3 justify-start"
     >
       <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
         <Sparkles className="h-4 w-4 text-primary-foreground" />
       </div>
       
       <div className="chat-bubble-assistant px-4 py-3">
         <div className="flex items-center gap-1">
           {[0, 1, 2].map((i) => (
             <motion.div
               key={i}
               className="w-2 h-2 bg-muted-foreground rounded-full"
               animate={{
                 opacity: [0.4, 1, 0.4],
                 scale: [0.8, 1, 0.8],
               }}
               transition={{
                 duration: 1.2,
                 repeat: Infinity,
                 delay: i * 0.15,
                 ease: 'easeInOut',
               }}
             />
           ))}
         </div>
       </div>
     </motion.div>
   );
 }