import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database } from 'lucide-react';

const PHRASES = [
  'Consultando base de dados...',
  'Analisando os registros...',
  'Processando informações...',
  'Organizando os resultados...',
  'Preparando a resposta...',
];

export function ThinkingBubble() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 justify-start"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center">
        <Database className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="chat-bubble-assistant flex flex-col gap-2 px-4 py-3 min-w-[140px]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-[12px] text-muted-foreground/60"
          >
            {PHRASES[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
