import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
      className={cn(
        'relative w-9 h-9 rounded-lg flex items-center justify-center',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'transition-colors duration-200'
      )}
    >
      <Sun className={cn('h-4 w-4 absolute transition-all duration-200', isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100')} />
      <Moon className={cn('h-4 w-4 absolute transition-all duration-200', isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0')} />
    </button>
  );
}
