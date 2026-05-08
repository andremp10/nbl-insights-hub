import { useEffect } from 'react';

interface Handlers {
  onFocusSearch?: () => void;
  onNewSession?: () => void;
  onToggleSidebar?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable;
}

export function useChatShortcuts({ onFocusSearch, onNewSession, onToggleSidebar, onPrev, onNext }: Handlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Cmd/Ctrl+K — focus search
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault(); onFocusSearch?.(); return;
      }
      // Cmd/Ctrl+B — toggle sidebar
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault(); onToggleSidebar?.(); return;
      }
      // Cmd/Ctrl+Shift+O — new session
      if (mod && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault(); onNewSession?.(); return;
      }
      // Alt+ArrowUp / Alt+ArrowDown — navigate sessions (only when not typing)
      if (e.altKey && !isTypingTarget(e.target)) {
        if (e.key === 'ArrowUp') { e.preventDefault(); onPrev?.(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); onNext?.(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFocusSearch, onNewSession, onToggleSidebar, onPrev, onNext]);
}
