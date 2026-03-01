import { NavLink, useLocation } from 'react-router-dom';
import { Menu, LogOut, Printer } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Assistente', path: '/chat' },
  { label: 'Financeiro', path: '/financeiro' },
  { label: 'Pedidos', path: '/pedidos' },
];

export function AppHeader() {
  const { logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onClick}
          className={cn(
            'text-sm transition-colors duration-150 pb-1',
            isActive(item.path)
              ? 'text-foreground border-b-2 border-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 md:px-6 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <Printer className="h-5 w-5 text-primary" />
        <span className="font-bold text-foreground text-base tracking-tight">
          NBL Gráfica
        </span>
        <span className="text-[10px] font-semibold text-primary-foreground bg-primary rounded px-1.5 py-0.5 leading-none">
          Insights
        </span>
      </div>

      {/* Center: Nav (desktop) */}
      <nav className="hidden md:flex items-center gap-8">
        <NavLinks />
      </nav>

      {/* Right: Avatar + Logout (desktop) / Hamburger (mobile) */}
      <div className="flex items-center gap-3">
        <button
          onClick={logout}
          aria-label="Sair"
          className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
            NB
          </div>
          <LogOut className="w-4 h-4" />
        </button>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button aria-label="Menu" className="md:hidden p-2 text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 bg-background border-border p-6">
            <nav className="flex flex-col gap-6 mt-8">
              <NavLinks onClick={() => setMobileOpen(false)} />
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors mt-4"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
