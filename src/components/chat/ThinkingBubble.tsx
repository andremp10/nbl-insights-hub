import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';

const PHRASES = [
  'Consultando base de dados…',
  'Analisando os registros…',
  'Processando informações…',
  'Organizando os resultados…',
  'Preparando a resposta…',
];

export function ThinkingBubble() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 bg-muted/30 rounded-xl px-4 py-3"
    >
      {/* Avatar simples */}
      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>

      {/* Dots + texto na mesma linha */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-muted-foreground/70 truncate"
          >
            {PHRASES[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
