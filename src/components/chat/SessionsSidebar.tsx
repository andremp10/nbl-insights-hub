import { forwardRef, lazy, Suspense, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  PanelLeft, PanelLeftClose, Plus, Search, X, MessageSquarePlus, ChevronDown, MessageSquare,
  Printer, LayoutDashboard, Bot, Wallet, PackageSearch, LogOut, UserPlus,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ChatSession } from '@/hooks/useChatSessions';
import { SessionItem } from './SessionItem';
import { DeleteSessionDialog } from './DeleteSessionDialog';

const CreateUserModal = lazy(() =>
  import('@/components/admin/CreateUserModal').then(m => ({ default: m.CreateUserModal }))
);

export type SidebarMode = 'expanded' | 'rail' | 'hidden';

export interface SessionsSidebarHandle {
  focusSearch: () => void;
}

interface Props {
  groupedSessions: [string, ChatSession[]][];
  pinnedIds: Set<string>;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onTogglePinSession: (id: string) => void;
  mode: SidebarMode;
  onModeChange: (m: SidebarMode) => void;
  loading: boolean;
}

const ALWAYS_OPEN_GROUPS = new Set(['Fixadas', 'Hoje', 'Ontem']);
const COLLAPSE_KEY = 'nbl_sidebar_collapsed_groups';

const APP_NAV = [
  { title: 'Home', url: '/', icon: LayoutDashboard, end: true },
  { title: 'Assistente', url: '/chat', icon: Bot, end: false },
  { title: 'Financeiro', url: '/financeiro', icon: Wallet, end: false },
  { title: 'Pedidos', url: '/pedidos', icon: PackageSearch, end: false },
];

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export const SessionsSidebar = forwardRef<SessionsSidebarHandle, Props>(function SessionsSidebar({
  groupedSessions, pinnedIds, currentSessionId, onSelectSession, onCreateSession,
  onDeleteSession, onRenameSession, onTogglePinSession, mode, onModeChange, loading,
}, ref) {
  const isMobile = useIsMobile();
  const { signOut, isMaster } = useAuth();
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed());
  const [pendingDelete, setPendingDelete] = useState<ChatSession | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSelect = (id: string) => {
    onSelectSession(id);
    if (isMobile) onModeChange('hidden');
  };

  const isNavActive = (url: string, end: boolean) =>
    end ? pathname === url : pathname.startsWith(url);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (mode !== 'expanded') onModeChange('expanded');
      setTimeout(() => searchRef.current?.focus(), 50);
    },
  }), [mode, onModeChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const cutoff =
      periodFilter === 'today' ? now - 86400000 :
      periodFilter === '7d' ? now - 7 * 86400000 :
      periodFilter === '30d' ? now - 30 * 86400000 :
      0;
    return groupedSessions
      .map(([g, items]) => {
        let list = items;
        if (q) list = list.filter(s => (s.title || 'Nova conversa').toLowerCase().includes(q));
        if (cutoff > 0 && g !== 'Fixadas') {
          list = list.filter(s => {
            const ts = Date.parse(s.last_message_at || s.created_at);
            return Number.isFinite(ts) && ts >= cutoff;
          });
        }
        return [g, list] as [string, ChatSession[]];
      })
      .filter(([, items]) => items.length > 0);
  }, [query, groupedSessions, periodFilter]);

  const totalSessions = groupedSessions.reduce((acc, [, items]) => acc + items.length, 0);
  const filteredCount = filtered.reduce((acc, [, items]) => acc + items.length, 0);

  function toggleGroup(name: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }

  // Recent flat list for rail
  const recent = useMemo(
    () => groupedSessions.flatMap(([, items]) => items).slice(0, 8),
    [groupedSessions]
  );

  // ── RAIL MODE (desktop only) ──────────────────────────
  if (mode === 'rail') {
    return (
      <TooltipProvider delayDuration={150}>
        <aside className="hidden md:flex flex-col w-[56px] h-full border-r border-border bg-sidebar-background shrink-0">
          {/* Brand */}
          <div className="h-12 flex items-center justify-center border-b border-border/70 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Printer className="h-4 w-4" />
            </div>
          </div>

          {/* App nav */}
          <nav className="px-2 pt-2 pb-1 flex flex-col gap-1 shrink-0">
            {APP_NAV.map(item => {
              const active = isNavActive(item.url, item.end);
              return (
                <Tooltip key={item.url}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className={cn(
                        'relative w-full h-9 rounded-lg flex items-center justify-center transition-colors',
                        active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-primary" />}
                      <item.icon className="h-[18px] w-[18px]" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{item.title}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          <div className="my-1 mx-3 h-px bg-border/60 shrink-0" />

          {/* Chat actions */}
          <div className="px-2 flex flex-col gap-1 shrink-0">
            <RailButton tooltip="Nova conversa (Ctrl+Shift+O)" onClick={onCreateSession} variant="primary">
              <Plus className="w-4 h-4" />
            </RailButton>
            <RailButton tooltip="Ver conversas (Ctrl+B)" onClick={() => onModeChange('expanded')}>
              <PanelLeft className="w-4 h-4" />
            </RailButton>
          </div>

          <div className="flex-1" />


          {/* Footer */}
          <div className="px-2 pb-2 pt-1 border-t border-border/70 flex flex-col gap-1 shrink-0">
            {isMaster && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="w-full h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <UserPlus className="w-[18px] h-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Novo usuário</TooltipContent>
              </Tooltip>
            )}
            <div className="flex justify-center"><ThemeToggle /></div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut()}
                  className="w-full h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Sair</TooltipContent>
            </Tooltip>
          </div>
          {showCreateUser && (
            <Suspense fallback={null}>
              <CreateUserModal open={showCreateUser} onOpenChange={setShowCreateUser} />
            </Suspense>
          )}
        </aside>
      </TooltipProvider>
    );
  }

  // ── EXPANDED / HIDDEN-on-mobile MODE ──────────────────
  const isHidden = mode === 'hidden';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-200',
          !isHidden ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onModeChange('hidden')}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed md:relative z-40 md:z-auto h-full w-[min(85vw,300px)] md:w-[280px] shrink-0',
          'border-r border-border bg-sidebar-background flex flex-col',
          'transition-transform duration-200 ease-out will-change-transform',
          !isHidden ? 'translate-x-0' : '-translate-x-full md:hidden',
        )}
        role="navigation"
        aria-label="Conversas"
      >
        {/* Brand header */}
        <div className="flex items-center justify-between gap-2 px-3 h-12 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
              <Printer className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col min-w-0 leading-none">
              <span className="text-[12.5px] font-semibold tracking-tight text-foreground truncate">NBL Gráfica</span>
              <span className="text-[9.5px] text-muted-foreground/70 mt-0.5">Insights Hub</span>
            </div>
          </div>
          <button
            onClick={() => onModeChange(isMobile ? 'hidden' : 'rail')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            aria-label={isMobile ? 'Fechar' : 'Recolher sidebar'}
            title={isMobile ? 'Fechar' : 'Recolher (Ctrl+B)'}
          >
            {isMobile ? <X className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* App navigation row */}
        <TooltipProvider delayDuration={200}>
          <nav className="px-2 pt-2 pb-2 grid grid-cols-4 gap-1 shrink-0 border-b border-border/40">
            {APP_NAV.map(item => {
              const active = isNavActive(item.url, item.end);
              return (
                <Tooltip key={item.url}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className={cn(
                        'relative h-9 rounded-md flex items-center justify-center transition-colors',
                        active
                          ? 'bg-primary/12 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                      aria-label={item.title}
                    >
                      <item.icon className="h-[16px] w-[16px]" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{item.title}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>

        {/* Section label */}
        <div className="px-3 pt-3 pb-1 flex items-center gap-2 shrink-0">
          <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">Conversas</span>
          {totalSessions > 0 && (
            <span className="text-[10px] tabular-nums font-mono px-1.5 py-px rounded-sm bg-muted/60 text-muted-foreground/80 border border-border/60 ml-auto">
              {totalSessions}
            </span>
          )}
        </div>

        {/* New conversation — primary CTA */}
        <div className="px-3 pt-1.5 pb-2 shrink-0">
          <button
            onClick={onCreateSession}
            className={cn(
              'group/cta relative flex items-center gap-2 w-full h-9 px-3 rounded-lg text-[12.5px] font-semibold',
              'bg-gradient-to-b from-primary to-[hsl(var(--primary)/0.92)] text-primary-foreground',
              'border border-primary/40 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18),0_1px_2px_hsl(var(--primary)/0.35)]',
              'hover:from-primary hover:to-primary hover:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.22),0_4px_14px_-2px_hsl(var(--primary)/0.45)]',
              'active:scale-[0.985] transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background',
            )}
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-primary-foreground/15 group-hover/cta:bg-primary-foreground/25 transition-colors">
              <Plus className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:rotate-90" />
            </span>
            <span>Nova conversa</span>
            <kbd className="hidden md:inline-flex items-center ml-auto text-[9px] font-mono tracking-wide opacity-80 bg-primary-foreground/15 px-1.5 py-0.5 rounded border border-primary-foreground/15">
              ⌘⇧O
            </kbd>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); searchRef.current?.blur(); } }}
              placeholder="Buscar conversas..."
              className={cn(
                'w-full h-9 pl-8 pr-9 rounded-md bg-muted/30 border border-border/60',
                'text-[12px] text-foreground placeholder:text-muted-foreground/50',
                'hover:bg-muted/50 hover:border-border',
                'focus:outline-none focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/15 transition-all',
              )}
            />
            {query ? (
              <button
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground/60 hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-muted-foreground/40 bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                ⌘K
              </kbd>
            )}
          </div>
          {query && (
            <p className="text-[10px] text-muted-foreground/60 mt-1.5 px-0.5">
              {filteredCount} resultado{filteredCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Period filter pills */}
        <div className="px-3 pb-2 shrink-0 flex items-center gap-1">
          {([
            { v: 'all', l: 'Tudo' },
            { v: 'today', l: 'Hoje' },
            { v: '7d', l: '7d' },
            { v: '30d', l: '30d' },
          ] as const).map(opt => (
            <button
              key={opt.v}
              onClick={() => setPeriodFilter(opt.v)}
              className={cn(
                'flex-1 h-6 px-2 text-[10.5px] font-medium rounded-md transition-all duration-100',
                periodFilter === opt.v
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 border border-transparent'
              )}
            >
              {opt.l}
            </button>
          ))}
        </div>


        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
          {loading ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Carregando...</div>
          ) : totalSessions === 0 ? (
            <EmptyState onCreate={onCreateSession} />
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-xs text-muted-foreground">Nenhuma conversa encontrada</p>
              <button onClick={() => setQuery('')} className="text-[11px] text-primary hover:underline mt-1">
                Limpar busca
              </button>
            </div>
          ) : (
            filtered.map(([groupLabel, items], groupIdx) => {
              const isCollapsible = !ALWAYS_OPEN_GROUPS.has(groupLabel);
              const isOpen = !collapsed.has(groupLabel);

              const content = (
                <div className="space-y-0.5">
                  {items.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      isPinned={pinnedIds.has(session.id)}
                      query={query}
                      onSelect={() => handleSelect(session.id)}
                      onRename={(t) => onRenameSession(session.id, t)}
                      onDelete={() => setPendingDelete(session)}
                      onTogglePin={() => onTogglePinSession(session.id)}
                    />
                  ))}
                </div>
              );

              if (!isCollapsible) {
                return (
                  <div key={groupLabel} className={cn('mb-3', groupIdx > 0 && 'pt-3 mt-1 border-t border-border/40')}>
                    <div className="px-3 pt-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                      {groupLabel}
                    </div>
                    {content}
                  </div>
                );
              }

              return (
                <Collapsible
                  key={groupLabel}
                  open={isOpen}
                  onOpenChange={() => toggleGroup(groupLabel)}
                  className={cn('mb-3', groupIdx > 0 && 'pt-3 mt-1 border-t border-border/40')}
                >
                  <CollapsibleTrigger className="w-full px-3 pt-0.5 pb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 hover:text-foreground transition-colors">
                    <ChevronDown className={cn('w-3 h-3 transition-transform duration-150', !isOpen && '-rotate-90')} />
                    <span>{groupLabel}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>{content}</CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>

        {/* Footer — app actions */}
        <div className="border-t border-border/70 px-2 py-1.5 shrink-0 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {isMaster && (
              <button
                onClick={() => setShowCreateUser(true)}
                className="h-8 px-2 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 transition-colors"
                title="Novo usuário"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo usuário</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => signOut()}
              className="h-8 px-2 rounded-md text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5 transition-colors"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <DeleteSessionDialog
        open={!!pendingDelete}
        title={pendingDelete?.title || 'Nova conversa'}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDeleteSession(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      {showCreateUser && (
        <Suspense fallback={null}>
          <CreateUserModal open={showCreateUser} onOpenChange={setShowCreateUser} />
        </Suspense>
      )}
    </>
  );
});

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-10 gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <MessageSquarePlus className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Nenhuma conversa ainda</p>
        <p className="text-[11px] text-muted-foreground mt-1">Comece sua primeira pergunta agora.</p>
      </div>
      <button
        onClick={onCreate}
        className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
      >
        <Plus className="w-3 h-3" /> Nova conversa
      </button>
    </div>
  );
}

function RailButton({
  children, tooltip, onClick, variant = 'ghost',
}: { children: React.ReactNode; tooltip: string; onClick: () => void; variant?: 'ghost' | 'primary' }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'group/rail mx-auto w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
            variant === 'primary'
              ? 'bg-gradient-to-b from-primary to-[hsl(var(--primary)/0.92)] text-primary-foreground border border-primary/40 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18),0_1px_2px_hsl(var(--primary)/0.35)] hover:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.22),0_4px_12px_-2px_hsl(var(--primary)/0.5)] active:scale-[0.95]'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 active:scale-[0.95]',
          )}
        >
          <span className={cn(variant === 'primary' && 'transition-transform duration-200 group-hover/rail:rotate-90')}>
            {children}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
