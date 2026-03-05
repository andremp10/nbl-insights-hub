import { motion } from 'framer-motion';
import { TrendingUp, Users, Package, CreditCard, BarChart2, Clock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  {
    icon: TrendingUp,
    text: 'Qual o faturamento deste mês?',
    description: 'Receita total do período atual',
  },
  {
    icon: Users,
    text: 'Top 10 clientes por valor de pedidos',
    description: 'Ranking por volume financeiro',
  },
  {
    icon: Package,
    text: 'Pedidos em produção agora',
    description: 'Status atual da produção',
  },
  {
    icon: BarChart2,
    text: 'Comparar receita vs despesas do mês',
    description: 'Visão geral do resultado',
  },
  {
    icon: CreditCard,
    text: 'Quais categorias de despesa mais cresceram?',
    description: 'Análise de custos por categoria',
  },
  {
    icon: Clock,
    text: 'Pedidos com pagamento pendente',
    description: 'Aguardando confirmação',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5 relative">
          <Bot className="w-8 h-8 text-primary" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-1">
          Assistente NBL Gráfica
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          Consulte dados em linguagem natural. Escolha uma sugestão ou digite sua pergunta.
        </p>

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
