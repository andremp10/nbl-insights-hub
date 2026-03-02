import { motion } from 'framer-motion';
import { TrendingUp, Users, Package, AlertTriangle, BarChart2, Clock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  {
    icon: TrendingUp,
    text: 'Faturamento do mês atual',
    description: 'Receita total do mês',
  },
  {
    icon: Users,
    text: 'Top 10 clientes',
    description: 'Por volume de pedidos',
  },
  {
    icon: Package,
    text: 'Pedidos pendentes',
    description: 'Em produção ou aguardando',
  },
  {
    icon: AlertTriangle,
    text: 'Pedidos atrasados',
    description: 'Fora do prazo de entrega',
  },
  {
    icon: BarChart2,
    text: 'Despesas por categoria',
    description: 'Distribuição de custos',
  },
  {
    icon: Clock,
    text: 'Pedidos de hoje',
    description: 'Criados nas últimas 24h',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      <motion.div
        className="text-center max-w-lg w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Hero */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5 relative">
          <Bot className="w-8 h-8 text-primary" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-1">
          Assistente NBL Gráfica
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          Consulte dados em linguagem natural. Experimente uma das sugestões abaixo.
        </p>

        {/* Sugestões em grid 2 colunas */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {SUGGESTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={s.text}
                variants={itemVariants}
                onClick={() => onSuggestionClick(s.text)}
                className={cn(
                  'flex items-start gap-3 text-left px-4 py-3 rounded-xl border border-border',
                  'text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5',
                  'transition-all duration-150 group'
                )}
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight">{s.text}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{s.description}</p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
