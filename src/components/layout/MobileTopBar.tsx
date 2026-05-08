import { Printer } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

/**
 * Top bar exibida apenas em <md (mobile/tablet pequeno).
 * Garante acesso ao menu lateral em todas as rotas protegidas.
 */
export function MobileTopBar() {
  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-12 px-3 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Printer className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">NBL Gráfica</span>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}
