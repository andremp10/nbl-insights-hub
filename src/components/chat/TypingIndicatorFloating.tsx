 import { motion } from 'framer-motion';
 
 export function TypingIndicatorFloating() {
   return (
     <motion.div
       className="fixed bottom-8 left-1/2 transform -translate-x-1/2 backdrop-blur-2xl bg-card/80 rounded-full px-4 py-2 shadow-lg border border-border/50 z-50"
       initial={{ opacity: 0, y: 20, scale: 0.95 }}
       animate={{ opacity: 1, y: 0, scale: 1 }}
       exit={{ opacity: 0, y: 20, scale: 0.95 }}
       transition={{ type: 'spring', damping: 20, stiffness: 300 }}
     >
       <div className="flex items-center gap-3">
         <div className="w-8 h-7 rounded-full bg-primary/20 flex items-center justify-center">
           <span className="text-xs font-semibold text-primary">NBL</span>
         </div>
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
           <span>Pensando</span>
           <TypingDots />
         </div>
       </div>
     </motion.div>
   );
 }
 
 function TypingDots() {
   return (
     <div className="flex items-center ml-1">
       {[1, 2, 3].map((dot) => (
         <motion.div
           key={dot}
           className="w-1.5 h-1.5 bg-primary rounded-full mx-0.5"
           initial={{ opacity: 0.3 }}
           animate={{
             opacity: [0.3, 0.9, 0.3],
             scale: [0.85, 1.1, 0.85],
           }}
           transition={{
             duration: 1.2,
             repeat: Infinity,
             delay: dot * 0.15,
             ease: 'easeInOut',
           }}
           style={{
             boxShadow: '0 0 4px hsl(var(--primary) / 0.3)',
           }}
         />
       ))}
     </div>
   );
 }