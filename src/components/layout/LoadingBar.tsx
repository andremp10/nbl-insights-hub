import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Lightweight loading bar — pure CSS, no framer-motion.
 * Debounced so quick queries don't flash the bar.
 */
export function LoadingBar() {
  const isFetching = useIsFetching();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isFetching > 0) {
      const t = setTimeout(() => setVisible(true), 120);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [isFetching]);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-0.5 z-50 pointer-events-none overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 150ms ease-out' }}
    >
      <div className="h-full w-1/3 bg-primary loading-bar-track" />
    </div>
  );
}
