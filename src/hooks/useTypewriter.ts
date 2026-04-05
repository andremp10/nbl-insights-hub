import { useState, useEffect, useRef } from 'react';

/**
 * Reveals text progressively with larger chunks for fluidity.
 */
export function useTypewriter(
  fullText: string,
  enabled: boolean,
  speed: number = 4,
): { displayedText: string; isTyping: boolean } {
  const [displayedText, setDisplayedText] = useState(enabled ? '' : fullText);
  const [isTyping, setIsTyping] = useState(enabled && fullText.length > 0);
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled || !fullText) {
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    indexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);
    lastTimeRef.current = 0;

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= speed) {
        const charsToAdd = Math.min(
          Math.ceil(elapsed / speed),
          24,
          fullText.length - indexRef.current,
        );
        indexRef.current += charsToAdd;
        lastTimeRef.current = timestamp;
        setDisplayedText(fullText.slice(0, indexRef.current));
      }

      if (indexRef.current < fullText.length) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setIsTyping(false);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fullText, enabled, speed]);

  return { displayedText, isTyping };
}
