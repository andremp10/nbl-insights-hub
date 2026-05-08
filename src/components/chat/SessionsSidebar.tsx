import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  PanelLeft, PanelLeftClose, Plus, Search, X, MessageSquarePlus, ChevronDown, MessageSquare,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed());
  const [pendingDelete, setPendingDelete] = useState<ChatSession | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSelect = (id: string) => {
    onSelectSession(id);
    if (isMobile) onModeChange('hidden');
  };

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (mode !== 'expanded') onModeChange('expanded');
      setTimeout(() => searchRef.current?.focus(), 50);
    },
  }), [mode, onModeChange]);

  const filtered = useMemo(() => {
    if (!query.trim()) return groupedSessions;
    const q = query.toLowerCase();
    return groupedSessions
      .map(([g, items]) => [g, items.filter(s => (s.title || 'Nova conversa').toLowerCase().includes(q))] as [string, ChatSession[]])
      .filter(([, items]) => items.length > 0);
  }, [query, groupedSessions]);

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
    () => groupedSessions.flatMap(([, items]) => items).slice(0, 10),
    [groupedSessions]
  );

  // ── RAIL MODE (desktop only) ──────────────────────────
  if (mode === 'rail') {
    return (
      <TooltipProvider delayDuration={150}>
        <aside className="hidden md:flex flex-col w-[52px] h-full border-r border-border bg-sidebar-background py-2 gap-1 shrink-0">
          <RailButton tooltip="Expandir (Ctrl+B)" onClick={() => onModeChange('expanded')}>
            <PanelLeft className="w-4 h-4" />
          </RailButton>
          <RailButton tooltip="Nova conversa (Ctrl+Shift+O)" onClick={onCreateSession} variant="primary">
            <Plus className="w-4 h-4" />
          </RailButton>
          <RailButton tooltip="Buscar (Ctrl+K)" onClick={() => onModeChange('expanded')}>
            <Search className="w-4 h-4" />
          </RailButton>
          <div className="my-1 mx-3 h-px bg-border/60" />
          <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center gap-1 px-2">
            {recent.map(s => {
              const isActive = s.id === currentSessionId;
              const isPinned = pinnedIds.has(s.id);
              return (
                <Tooltip key={s.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectSession(s.id)}
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative',
                        isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      {isActive && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-primary" />}
                      {isPinned ? '★' : <MessageSquare className="w-3.5 h-3.5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[240px]">
                    <p className="text-xs font-medium truncate">{s.title || 'Nova conversa'}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
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
          'fixed md:relative z-40 md:z-auto h-full w-[min(85vw,320px)] md:w-[280px] shrink-0',
          'border-r border-border bg-sidebar-background flex flex-col',
          'transition-transform duration-200 ease-out will-change-transform',
          !isHidden ? 'translate-x-0' : '-translate-x-full md:hidden',
        )}
        role="navigation"
        aria-label="Conversas"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Conversas</span>
            {totalSessions > 0 && (
              <span className="text-[10px] tabular-nums text-muted-foreground/60 font-mono">
                {totalSessions}
              </span>
            )}
          </div>
          <button
            onClick={() => onModeChange(window.innerWidth < 768 ? 'hidden' : 'rail')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Recolher sidebar"
            title="Recolher (Ctrl+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New conversation — primary CTA */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={onCreateSession}
            className={cn(
              'flex items-center justify-center gap-2 w-full h-9 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground shadow-sm shadow-primary/20',
              'hover:bg-primary/90 active:scale-[0.98] transition-all duration-150',
            )}
          >
            <Plus className="w-4 h-4" />
            Nova conversa
            <kbd className="ml-auto text-[9px] font-mono opacity-70 bg-primary-foreground/15 px-1.5 py-0.5 rounded">
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
                'w-full h-8 pl-8 pr-8 rounded-md bg-muted/40 border border-border/60',
                'text-[12px] text-foreground placeholder:text-muted-foreground/50',
                'focus:outline-none focus:border-primary/50 focus:bg-background transition-colors',
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
            filtered.map(([groupLabel, items]) => {
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
                      onSelect={() => onSelectSession(session.id)}
                      onRename={(t) => onRenameSession(session.id, t)}
                      onDelete={() => setPendingDelete(session)}
                      onTogglePin={() => onTogglePinSession(session.id)}
                    />
                  ))}
                </div>
              );

              if (!isCollapsible) {
                return (
                  <div key={groupLabel} className="mb-3">
                    <div className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                      {groupLabel === 'Fixadas' && <span className="text-primary">★</span>}
                      {groupLabel}
                      <span className="font-mono opacity-60">· {items.length}</span>
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
                  className="mb-3"
                >
                  <CollapsibleTrigger className="w-full px-3 pt-1 pb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors">
                    <ChevronDown className={cn('w-3 h-3 transition-transform', !isOpen && '-rotate-90')} />
                    {groupLabel}
                    <span className="font-mono opacity-60">· {items.length}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>{content}</CollapsibleContent>
                </Collapsible>
              );
            })
          )}
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
            'mx-auto w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
            variant === 'primary'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
