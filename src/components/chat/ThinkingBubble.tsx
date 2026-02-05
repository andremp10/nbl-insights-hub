import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function ThinkingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-3 justify-start"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </div>

      {/* Bubble */}
      <div className="chat-bubble-assistant flex items-center gap-1.5 px-4 py-3 min-w-[80px]">
        <div className="text-xs font-medium text-foreground/70 mr-1">Pensando</div>
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-primary/70"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-primary/70"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0.2,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-primary/70"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: 0.4,
            ease: "easeInOut",
          }}
        />
      </div>
    </motion.div>
  );
}
