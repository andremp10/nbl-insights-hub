import { lazy, Suspense, useState } from 'react';
import { LayoutDashboard, Bot, Wallet, PackageSearch, LogOut, Printer, UserPlus } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const CreateUserModal = lazy(() =>
  import('@/components/admin/CreateUserModal').then(m => ({ default: m.CreateUserModal }))
);

const menuItems = [
  { title: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Assistente', url: '/chat', icon: Bot },
  { title: 'Financeiro', url: '/financeiro', icon: Wallet },
  { title: 'Pedidos', url: '/pedidos', icon: PackageSearch },
];

const RAIL_W = 56;   // collapsed rail width in px
const FULL_W = 220;  // hover-expanded width in px

export function AppSidebar() {
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();
  const [showCreateUser, setShowCreateUser] = useState(false);

  if (isMobile) {
    return (
      <>
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            side="left"
            className="p-0 w-[260px] bg-sidebar border-r border-sidebar-border [&>button]:hidden"
          >
            <SidebarInner
              expanded
              onItemClick={() => setOpenMobile(false)}
              onCreateUser={() => { setOpenMobile(false); setShowCreateUser(true); }}
            />
          </SheetContent>
        </Sheet>
        {showCreateUser && (
          <Suspense fallback={null}>
            <CreateUserModal open={showCreateUser} onOpenChange={setShowCreateUser} />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <>
      {/* Spacer that reserves the rail width in the flex layout */}
      <div style={{ width: RAIL_W }} className="hidden md:block shrink-0 h-full" aria-hidden />

      {/* Floating sidebar — expands on hover OVER content */}
      <aside
        className={cn(
          'group/sidebar fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col',
          'bg-sidebar border-r border-sidebar-border',
          'transition-[width] duration-200 ease-out overflow-hidden',
          'hover:shadow-[6px_0_24px_-12px_rgba(0,0,0,0.35)]',
        )}
        style={{ width: RAIL_W }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.width = `${FULL_W}px`; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.width = `${RAIL_W}px`; }}
      >
        <SidebarInner onCreateUser={() => setShowCreateUser(true)} />
      </aside>

      {showCreateUser && (
        <Suspense fallback={null}>
          <CreateUserModal open={showCreateUser} onOpenChange={setShowCreateUser} />
        </Suspense>
      )}
    </>
  );
}

interface InnerProps {
  expanded?: boolean;
  onItemClick?: () => void;
  onCreateUser: () => void;
}

function SidebarInner({ expanded, onItemClick, onCreateUser }: InnerProps) {
  const { signOut, isMaster } = useAuth();
  const { pathname } = useLocation();

  const isActive = (url: string) =>
    url === '/' ? pathname === '/' : pathname.startsWith(url);

  const labelClass = expanded
    ? 'opacity-100'
    : 'opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center gap-2.5 px-3 border-b border-sidebar-border shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Printer className="h-4 w-4" />
          </div>
          <div className={cn('flex flex-col min-w-0 whitespace-nowrap', labelClass)}>
            <span className="text-[13px] font-semibold tracking-tight text-sidebar-foreground truncate">
              NBL Gráfica
            </span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">Insights Hub</span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-1.5">
          <ul className="space-y-0.5">
            {menuItems.map((item) => {
              const active = isActive(item.url);
              const link = (
                <NavLink
                  to={item.url}
                  end={item.url === '/'}
                  onClick={onItemClick}
                  className={cn(
                    'relative flex items-center gap-3 h-9 rounded-md px-2.5 transition-colors',
                    active
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {active && (
                    <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />
                  )}
                  <item.icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-primary')} />
                  <span className={cn('text-[13px] whitespace-nowrap', labelClass, active ? 'font-semibold' : 'font-medium')}>
                    {item.title}
                  </span>
                </NavLink>
              );
              return (
                <li key={item.title}>
                  {expanded ? link : (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{item.title}</TooltipContent>
                    </Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-1.5 shrink-0 space-y-0.5">
          {isMaster && (
            <FooterAction
              expanded={expanded}
              onClick={onCreateUser}
              icon={<UserPlus className="h-[18px] w-[18px]" />}
              label="Novo usuário"
              labelClass={labelClass}
            />
          )}
          <FooterAction
            expanded={expanded}
            onClick={() => { signOut(); onItemClick?.(); }}
            icon={<LogOut className="h-[18px] w-[18px]" />}
            label="Sair"
            labelClass={labelClass}
            danger
          />
          <div className={cn(
            'flex items-center h-9 px-2.5 rounded-md text-muted-foreground',
            expanded ? 'justify-between' : 'justify-center group-hover/sidebar:justify-between'
          )}>
            <span className={cn('text-[11px] uppercase tracking-wider', labelClass)}>Tema</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function FooterAction({
  icon, label, onClick, expanded, labelClass, danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  expanded?: boolean;
  labelClass: string;
  danger?: boolean;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 h-9 px-2.5 rounded-md transition-colors text-muted-foreground',
        danger ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-muted hover:text-foreground'
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className={cn('text-[13px] whitespace-nowrap', labelClass)}>{label}</span>
    </button>
  );
  if (expanded) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}
