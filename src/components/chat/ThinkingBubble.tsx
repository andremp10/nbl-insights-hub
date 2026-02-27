import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function ThinkingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex gap-3 justify-start"
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
      >
        <Sparkles className="h-4 w-4 text-primary-foreground" />
      </motion.div>

      {/* Bubble */}
      <div className="chat-bubble-assistant flex items-center gap-2 px-4 py-3 min-w-[100px]">
        <span className="text-xs font-medium text-foreground/60">Pensando</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{
                scale: [0.8, 1.3, 0.8],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
