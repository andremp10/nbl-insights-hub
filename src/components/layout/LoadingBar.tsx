import { useIsFetching } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

export function LoadingBar() {
  const isFetching = useIsFetching();

  return (
    <AnimatePresence>
      {isFetching > 0 && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
          style={{ transformOrigin: 'left' }}
        />
      )}
    </AnimatePresence>
  );
}
